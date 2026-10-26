import { afterEach, describe, expect, it, vi } from 'vitest';
import { Insight } from './index.ts';

const endpoint = 'http://127.0.0.1:8000/api/v1/events';
const writeKey = `iw_${'a'.repeat(32)}`;

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Insight', () => {
  it('sends one explicit event and keeps the anonymous id', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ status: 'accepted' })),
      );
    const insight = new Insight({
      writeKey,
      endpoint,
      fetch: fetchMock,
    });

    const first = await insight.track('note_created', {
      notebook: 'Field notes',
    });
    const second = await insight.track('note_created');

    expect(first).toEqual({ ok: true, status: 'accepted' });
    expect(second.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body)) as {
      write_key: string;
      name: string;
      anonymous_id: string;
      event_id: string;
      occurred_at: string;
      properties: { notebook: string };
    };

    expect(url).toBe(endpoint);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('omit');
    expect(payload.write_key).toBe(writeKey);
    expect(payload.name).toBe('note_created');
    expect(payload.anonymous_id).toBe(insight.anonymousId());
    expect(payload.event_id).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(payload.occurred_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(payload.properties).toEqual({ notebook: 'Field notes' });

    const repeat = JSON.parse(
      String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body),
    ) as {
      anonymous_id: string;
      event_id: string;
    };
    expect(repeat.anonymous_id).toBe(payload.anonymous_id);
    expect(repeat.event_id).not.toBe(payload.event_id);
    expect(localStorage.getItem('insight.anonymous_id')).toBe(
      payload.anonymous_id,
    );
  });

  it('stores an application user id and clears it on reset', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(jsonResponse({ status: 'accepted' })),
      );
    const insight = new Insight({
      writeKey,
      endpoint,
      fetch: fetchMock,
    });
    const original = insight.anonymousId();

    expect(insight.identify('short')).toBe(false);
    expect(insight.identify('reader_42')).toBe(true);

    await insight.track('note_opened');

    const payload = JSON.parse(
      String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body),
    ) as {
      user_id?: string;
      anonymous_id: string;
    };
    expect(payload.user_id).toBe('reader_42');
    expect(payload.anonymous_id).toBe(original);

    insight.reset();

    expect(insight.anonymousId()).not.toBe(original);
    expect(insight.userId()).toBeNull();
    expect(localStorage.getItem('insight.user_id')).toBeNull();
  });

  it('keeps a memory identity out of localStorage', () => {
    const insight = new Insight({
      writeKey,
      endpoint,
      persistence: 'memory',
      fetch: vi.fn(),
    });

    insight.identify('reader_42');

    expect(insight.userId()).toBe('reader_42');
    expect(localStorage.getItem('insight.anonymous_id')).toBeNull();
    expect(localStorage.getItem('insight.user_id')).toBeNull();
  });

  it('reports a network failure without throwing', async () => {
    const insight = new Insight({
      writeKey,
      endpoint,
      fetch: vi.fn().mockRejectedValue(new Error('offline')),
    });

    await expect(insight.track('note_created')).resolves.toEqual({
      ok: false,
      error: 'The event could not be sent.',
    });
  });

  it('reports a rejected event without throwing', async () => {
    const insight = new Insight({
      writeKey,
      endpoint,
      fetch: vi.fn().mockResolvedValue(jsonResponse({ message: 'no' }, 422)),
    });

    await expect(insight.track('note_created')).resolves.toEqual({
      ok: false,
      error: 'The event was rejected.',
    });
  });
});
