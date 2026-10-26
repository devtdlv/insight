import { render, screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { compareMetric, formatCount, formatRatio } from '../lib/analytics.ts';
import { MetricCard } from './MetricCard.tsx';

it('renders the label, value, comparison, and previous value', () => {
  render(
    <MetricCard
      label="Total events"
      value={formatCount(1200)}
      comparison={compareMetric(1200, 960)}
      previousValue={formatCount(960)}
      previousNumber={960}
      description="All events in the period."
    />,
  );

  const card = screen.getByRole('article', { name: 'Total events' });

  expect(
    within(card).getByRole('heading', { level: 3, name: 'Total events' }),
  ).toBeInTheDocument();
  expect(within(card).getByText('1,200')).toBeInTheDocument();
  expect(within(card).getByText('Previous period: 960')).toBeInTheDocument();
  expect(within(card).getByText(/Up 25% compared with/)).toBeInTheDocument();
  expect(
    within(card).getByText('All events in the period.'),
  ).toBeInTheDocument();
});

it('shows an unavailable value and comparison for a null ratio', () => {
  render(
    <MetricCard
      label="Events per visitor"
      value={null}
      comparison={compareMetric(null, 2.5)}
      unavailableText="No visitors yet"
    />,
  );

  const card = screen.getByRole('article', { name: 'Events per visitor' });

  expect(within(card).getByText('No visitors yet')).toBeInTheDocument();
  expect(within(card).getByText('No comparison')).toBeInTheDocument();
  expect(card).not.toHaveTextContent(/NaN|Infinity/);
});

it('shows zero as a real value with no change', () => {
  render(
    <MetricCard
      label="Identified users"
      value={formatCount(0)}
      comparison={compareMetric(0, 0)}
      previousValue={formatCount(0)}
    />,
  );

  const card = screen.getByRole('article', { name: 'Identified users' });

  expect(within(card).getByText('0')).toBeInTheDocument();
  expect(within(card).getByText('Previous period: 0')).toBeInTheDocument();
  expect(card).toHaveTextContent('No change');
});

it('supports a custom formatter for ratio differences', () => {
  render(
    <MetricCard
      label="Events per visitor"
      value={formatRatio(3)}
      comparison={compareMetric(3, 0)}
      previousNumber={0}
      format={(value) => formatRatio(value)}
    />,
  );

  expect(screen.getByText('3 from 0')).toBeInTheDocument();
});
