import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { AnalyticsTopEvent } from '../types/analytics.ts';
import { TopEvents } from './TopEvents.tsx';

const events: AnalyticsTopEvent[] = [
  { name: 'page_viewed', count: 5, share: 5 / 26 },
  { name: 'NOTE_CREATED', count: 3, share: 3 / 26 },
  { name: 'Note_Created', count: 3, share: 3 / 26 },
  { name: 'note_created', count: 3, share: 3 / 26 },
];

it('lists events in the supplied order with counts and shares', () => {
  render(<TopEvents events={events} />);

  const items = within(screen.getByRole('list')).getAllByRole('listitem');

  expect(items.map((item) => item.querySelector('span')?.textContent)).toEqual([
    'page_viewed',
    'NOTE_CREATED',
    'Note_Created',
    'note_created',
  ]);
  expect(items[0]).toHaveTextContent('5');
  expect(items[0]).toHaveTextContent('19.2%');
  expect(items[1]).toHaveTextContent('11.5%');
});

it('keeps event name case and keeps differently cased names separate', () => {
  render(<TopEvents events={events} />);

  expect(screen.getByText('NOTE_CREATED')).toBeInTheDocument();
  expect(screen.getByText('Note_Created')).toBeInTheDocument();
  expect(screen.getByText('note_created')).toBeInTheDocument();
});

it('scales bars to the share of all events, not to the top event', () => {
  render(<TopEvents events={[{ name: 'only_one', count: 1, share: 0.25 }]} />);

  expect(screen.getByTestId('share-bar')).toHaveStyle({ width: '25%' });
  expect(
    screen.getByText('Shares are a percentage of all events in the period.'),
  ).toBeInTheDocument();
});

it('clamps unusual shares and hides nothing behind NaN', () => {
  render(
    <TopEvents
      events={[
        { name: 'over', count: 1, share: 4 },
        { name: 'nan', count: 1, share: Number.NaN },
        { name: 'tiny', count: 1, share: 0.0002 },
      ]}
    />,
  );

  const bars = screen.getAllByTestId('share-bar');

  expect(bars[0]).toHaveStyle({ width: '100%' });
  expect(bars[1]).toHaveStyle({ width: '0%' });
  expect(bars[2]).toHaveStyle({ width: '1%' });
  expect(document.body).not.toHaveTextContent(/NaN|Infinity/);
});

it('shows an empty state without a list', () => {
  render(<TopEvents events={[]} />);

  expect(
    screen.getByRole('heading', { level: 3, name: 'Top events' }),
  ).toBeInTheDocument();
  expect(screen.getByText('No events in this period yet.')).toBeInTheDocument();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});

it('renders long names fully, wrapped, with a title', () => {
  const longName = `checkout.${'very_long_segment_'.repeat(4)}completed`;

  render(<TopEvents events={[{ name: longName, count: 2, share: 1 }]} />);

  const name = screen.getByText(longName);

  expect(name).toHaveAttribute('title', longName);
  expect(name).toHaveClass('break-all');
});

it('renders names as text, never as HTML', () => {
  const { container } = render(
    <TopEvents events={[{ name: '<b>bold</b>', count: 1, share: 1 }]} />,
  );

  expect(screen.getByText('<b>bold</b>')).toBeInTheDocument();
  expect(container.querySelector('b')).toBeNull();
});

it('gives each row a readable count and share for screen readers', () => {
  render(<TopEvents events={[events[0]]} />);

  expect(screen.getByRole('listitem')).toHaveTextContent(
    /page_viewed5.*19\.2%.*of all events/,
  );
});
