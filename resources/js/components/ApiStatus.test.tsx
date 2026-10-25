import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ApiStatus } from './ApiStatus.tsx';

it('shows a connected state when the health contract matches', async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ status: 'ok', service: 'insight-api' }),
  });
  vi.stubGlobal('fetch', fetchMock);

  render(<ApiStatus />);

  expect(await screen.findByText('API connected')).toBeInTheDocument();

  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toMatch(/\/api\/v1\/health$/);
  expect(init.headers).toMatchObject({ Accept: 'application/json' });
});

it('shows an unavailable state when the health request fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

  render(<ApiStatus />);

  expect(await screen.findByText('API unavailable')).toBeInTheDocument();
});

it('shows an unavailable state when the payload is not the health contract', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', database: 'postgres' }),
    }),
  );

  render(<ApiStatus />);

  expect(await screen.findByText('API unavailable')).toBeInTheDocument();
});

it('shows a checking state while the health request is pending', () => {
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => undefined)));

  render(<ApiStatus />);

  expect(screen.getByRole('status')).toHaveTextContent('Checking API');
});
