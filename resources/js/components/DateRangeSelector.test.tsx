import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type {
  AnalyticsRange,
  AnalyticsRangeErrors,
} from '../types/analytics.ts';
import { DateRangeSelector } from './DateRangeSelector.tsx';

const get = vi.fn();

vi.mock('@inertiajs/react', () => ({
  router: {
    get: (...args: unknown[]) => get(...args),
  },
}));

// 2026-10-14 20:00 UTC: already Oct 15 in Manila, still Oct 14 in Los Angeles.
const now = () => new Date('2026-10-14T20:00:00Z');

const range = (overrides: Partial<AnalyticsRange> = {}): AnalyticsRange => ({
  preset: '7d',
  timezone: 'Asia/Manila',
  localFrom: '2026-10-09',
  localTo: '2026-10-15',
  granularity: 'day',
  inProgress: true,
  ...overrides,
});

function renderSelector(
  props: {
    range?: AnalyticsRange;
    timezone?: string;
    errors?: AnalyticsRangeErrors;
  } = {},
) {
  const ui = (next: typeof props) => (
    <DateRangeSelector
      workspaceId={4}
      projectId={8}
      timezone={next.timezone ?? 'Asia/Manila'}
      range={next.range ?? range()}
      errors={next.errors}
      getNow={now}
    />
  );
  const view = render(ui(props));

  return {
    ...view,
    update: (next: typeof props) => view.rerender(ui(next)),
  };
}

const radio = (name: string) => screen.getByRole('radio', { name });
const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement;

beforeEach(() => {
  get.mockClear();
});

it('offers every preset and marks the server range as selected', () => {
  renderSelector();

  expect(
    screen.getAllByRole('radio').map((r) => r.getAttribute('value')),
  ).toEqual(['24h', '7d', '30d', '90d', 'custom']);
  expect(radio('Last 7 days')).toBeChecked();
  expect(radio('Last 24 hours')).not.toBeChecked();
  expect(screen.getByRole('group', { name: 'Date range' })).toBeInTheDocument();
  expect(
    screen.getByText('Last 7 days (Oct 9, 2026 to Oct 15, 2026)'),
  ).toBeInTheDocument();
  expect(screen.getByText(/Asia\/Manila/)).toBeInTheDocument();
});

it.each([
  ['Last 24 hours', '24h'],
  ['Last 30 days', '30d'],
  ['Last 90 days', '90d'],
])('requests only analytics when %s is chosen', (label, value) => {
  renderSelector();

  fireEvent.click(radio(label));

  expect(get).toHaveBeenCalledOnce();
  expect(get).toHaveBeenCalledWith(
    '/workspaces/4/projects/8',
    { range: value },
    expect.objectContaining({
      only: ['analytics'],
      preserveState: true,
      preserveScroll: true,
    }),
  );
});

it('does not navigate when Custom is chosen until Apply is pressed', () => {
  renderSelector();

  fireEvent.click(radio('Custom range'));

  expect(get).not.toHaveBeenCalled();
  expect(field('From').value).toBe('2026-10-09');
  expect(field('To').value).toBe('2026-10-15');
});

it('submits a valid custom range as local dates', () => {
  renderSelector();

  fireEvent.click(radio('Custom range'));
  fireEvent.change(field('From'), { target: { value: '2026-10-01' } });
  fireEvent.change(field('To'), { target: { value: '2026-10-03' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(get).toHaveBeenCalledWith(
    '/workspaces/4/projects/8',
    { range: 'custom', from: '2026-10-01', to: '2026-10-03' },
    expect.objectContaining({ only: ['analytics'] }),
  );
});

it('submits with the Enter key from a date field', () => {
  renderSelector();

  fireEvent.click(radio('Custom range'));
  fireEvent.submit(field('To').closest('form') as HTMLFormElement);

  expect(get).toHaveBeenCalledOnce();
});

it.each([
  ['an empty start', '', '2026-10-03', 'Enter a start date.'],
  ['an empty end', '2026-10-01', '', 'Enter an end date.'],
  [
    'reversed dates',
    '2026-10-05',
    '2026-10-01',
    'The end date must be on or after the start date.',
  ],
  [
    'a future end date',
    '2026-10-10',
    '2026-10-16',
    'The end date cannot be in the future.',
  ],
  [
    'more than 90 dates',
    '2026-07-16',
    '2026-10-15',
    'The range can cover at most 90 days.',
  ],
])('blocks %s without navigating', (_name, from, to, message) => {
  renderSelector();

  fireEvent.click(radio('Custom range'));
  fireEvent.change(field('From'), { target: { value: from } });
  fireEvent.change(field('To'), { target: { value: to } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(get).not.toHaveBeenCalled();
});

it('accepts today and exactly 90 dates in the project timezone', () => {
  renderSelector();

  fireEvent.click(radio('Custom range'));
  fireEvent.change(field('From'), { target: { value: '2026-07-18' } });
  fireEvent.change(field('To'), { target: { value: '2026-10-15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(get).toHaveBeenCalledOnce();
});

it('limits date inputs to today in the project timezone, not the browser', () => {
  const manila = renderSelector({ timezone: 'Asia/Manila' });
  fireEvent.click(radio('Custom range'));
  expect(field('To')).toHaveAttribute('max', '2026-10-15');
  manila.unmount();

  renderSelector({ timezone: 'America/Los_Angeles' });
  fireEvent.click(radio('Custom range'));
  expect(field('From')).toHaveAttribute('max', '2026-10-14');
  expect(field('To')).toHaveAttribute('max', '2026-10-14');
});

it('treats Oct 15 as the future for a Los Angeles project', () => {
  renderSelector({ timezone: 'America/Los_Angeles' });

  fireEvent.click(radio('Custom range'));
  fireEvent.change(field('From'), { target: { value: '2026-10-15' } });
  fireEvent.change(field('To'), { target: { value: '2026-10-15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

  expect(get).not.toHaveBeenCalled();
  expect(screen.getAllByRole('alert')).toHaveLength(2);
});

it('shows Laravel validation errors next to their fields', () => {
  renderSelector({
    range: range({ preset: 'custom' }),
    errors: { from: 'The start date cannot be in the future.' },
  });

  const from = field('From');

  expect(screen.getByRole('alert')).toHaveTextContent(
    'The start date cannot be in the future.',
  );
  expect(from).toHaveAttribute('aria-invalid', 'true');
  expect(from.getAttribute('aria-describedby')).toMatch(/-from-error/);
});

it('shows a range error under the presets', () => {
  renderSelector({ errors: { range: 'Choose one of: 24h, 7d.' } });

  expect(screen.getByRole('alert')).toHaveTextContent('Choose one of');
});

it('keeps the draft while errors are shown and labels the range actually used', () => {
  const view = renderSelector({
    range: range({ preset: 'custom' }),
  });

  fireEvent.change(field('From'), { target: { value: '2026-10-10' } });
  fireEvent.change(field('To'), { target: { value: '2026-10-20' } });

  // The server rejected it and redirected to the default 7d view.
  view.update({
    range: range({ preset: '7d' }),
    errors: { to: 'The end date cannot be in the future.' },
  });

  expect(radio('Custom range')).toBeChecked();
  expect(field('From').value).toBe('2026-10-10');
  expect(field('To').value).toBe('2026-10-20');
  expect(
    screen.getByText('Last 7 days (Oct 9, 2026 to Oct 15, 2026)'),
  ).toBeInTheDocument();
});

it('follows the server range when it changes without errors (back and forward)', () => {
  const view = renderSelector();

  fireEvent.click(radio('Last 30 days'));
  view.update({
    range: range({ preset: '30d', localFrom: '2026-09-16' }),
  });
  expect(radio('Last 30 days')).toBeChecked();

  // Browser back restores the earlier analytics prop.
  view.update({ range: range() });
  expect(radio('Last 7 days')).toBeChecked();
  expect(radio('Last 30 days')).not.toBeChecked();

  // Forward to a custom range shows its dates.
  view.update({
    range: range({
      preset: 'custom',
      localFrom: '2026-10-01',
      localTo: '2026-10-03',
    }),
  });
  expect(radio('Custom range')).toBeChecked();
  expect(field('From').value).toBe('2026-10-01');
  expect(field('To').value).toBe('2026-10-03');
  expect(screen.getByText('Oct 1, 2026 to Oct 3, 2026')).toBeInTheDocument();
});

it('resynchronises after errors clear on the next valid response', () => {
  const view = renderSelector({ range: range({ preset: 'custom' }) });

  view.update({
    range: range({ preset: '7d' }),
    errors: { to: 'The end date cannot be in the future.' },
  });
  expect(radio('Custom range')).toBeChecked();

  view.update({ range: range({ preset: '30d', localFrom: '2026-09-16' }) });
  expect(radio('Last 30 days')).toBeChecked();
});

it('retries a preset equal to the server range after a failed request', () => {
  renderSelector({
    range: range({ preset: '7d' }),
    errors: { range: 'Choose one of: 24h, 7d.' },
  });

  fireEvent.click(radio('Last 30 days'));
  expect(get).toHaveBeenCalledTimes(1);
});

it('falls back to the default preset for an unknown server preset', () => {
  renderSelector({
    range: range({ preset: 'bogus' as unknown as AnalyticsRange['preset'] }),
  });

  expect(radio('Last 7 days')).toBeChecked();
});

it('marks the form busy until the visit finishes', () => {
  const { container } = renderSelector();
  const form = container.querySelector('form') as HTMLFormElement;

  expect(form).toHaveAttribute('aria-busy', 'false');

  fireEvent.click(radio('Last 30 days'));
  expect(form).toHaveAttribute('aria-busy', 'true');

  const options = get.mock.calls[0][2] as { onFinish: () => void };
  fireEvent.click(radio('Last 7 days'));
  options.onFinish();
});
