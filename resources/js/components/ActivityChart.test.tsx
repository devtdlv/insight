import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { niceScale } from '../lib/activityChart.ts';
import type { AnalyticsActivityBucket } from '../types/analytics.ts';
import { ActivityChart } from './ActivityChart.tsx';

function bucket(
  index: number,
  overrides: Partial<AnalyticsActivityBucket> = {},
): AnalyticsActivityBucket {
  return {
    key: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    start: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
    end: `2026-10-${String(index + 2).padStart(2, '0')}T00:00:00Z`,
    label: `Oct ${index + 1}`,
    localStart: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00+00:00`,
    partial: false,
    count: 0,
    ...overrides,
  };
}

const daily = (counts: number[]) =>
  counts.map((count, index) => bucket(index, { count }));

function hourly(
  entries: Array<{
    key: string;
    label: string;
    localStart: string;
    count: number;
    partial?: boolean;
  }>,
): AnalyticsActivityBucket[] {
  return entries.map((entry) => ({
    start: entry.key,
    end: entry.key,
    partial: false,
    ...entry,
  }));
}

const svg = (container: HTMLElement) =>
  container.querySelector('svg') as SVGSVGElement;

const tableRows = () =>
  within(screen.getByRole('table', { hidden: true })).getAllByRole('row', {
    hidden: true,
  });

const xLabels = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('text[data-axis="x"]')).map((node) =>
    Array.from(node.querySelectorAll('tspan')).map((span) => span.textContent),
  );

describe('niceScale', () => {
  it('starts at zero with integer steps and at least four rows', () => {
    expect(niceScale(0)).toEqual({ top: 4, step: 1 });
    expect(niceScale(1)).toEqual({ top: 4, step: 1 });
    expect(niceScale(3)).toEqual({ top: 4, step: 1 });
    expect(niceScale(5)).toEqual({ top: 6, step: 2 });
    expect(niceScale(120)).toEqual({ top: 150, step: 50 });
    expect(niceScale(Number.NaN)).toEqual({ top: 4, step: 1 });
    expect(niceScale(2_500_000_000)).toEqual({
      top: 3_000_000_000,
      step: 1_000_000_000,
    });
  });
});

it('draws normal daily data with a title, description, and axes', () => {
  const { container } = render(
    <ActivityChart
      buckets={daily([2, 5, 0, 8, 3, 1, 4])}
      heading="Events over time"
      description="Events per day."
    />,
  );

  expect(
    screen.getByRole('heading', { level: 3, name: 'Events over time' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Events per day.')).toBeInTheDocument();
  expect(
    screen.getByRole('img', { name: /Events over time/ }),
  ).toBeInTheDocument();
  expect(container.querySelector('path[data-line="solid"]')).not.toBeNull();
  expect(container.querySelectorAll('circle')).toHaveLength(7);
  expect(xLabels(container)).toHaveLength(7);
  expect(xLabels(container)[0]).toEqual(['Oct 1']);
  expect(
    Array.from(container.querySelectorAll('text[data-axis="y"]')).map(
      (node) => node.textContent,
    ),
  ).toEqual(['0', '2', '4', '6', '8']);
});

it('summarises the data for assistive technology and in visible text', () => {
  const { container } = render(
    <ActivityChart buckets={daily([2, 5, 0, 8, 3, 1, 4])} />,
  );

  expect(
    screen.getByText('23 events in total. Busiest: Oct 4, 8.'),
  ).toBeInTheDocument();
  expect(svg(container).querySelector('title')).toHaveTextContent(
    '7 periods, from Oct 1 to Oct 7. 23 events in total. Busiest: Oct 4, 8.',
  );
  expect(screen.getByRole('group', { name: /scrollable/ })).toHaveAttribute(
    'tabindex',
    '0',
  );
});

it('lists every bucket in a data table with counts and status', () => {
  render(<ActivityChart buckets={daily([2, 5, 0])} />);

  const rows = tableRows();

  expect(rows).toHaveLength(4);
  expect(rows[1]).toHaveTextContent('Oct 1');
  expect(rows[1]).toHaveTextContent('2');
  expect(rows[3]).toHaveTextContent('Oct 3');
  expect(rows[3]).toHaveTextContent('0');
  expect(rows[3]).toHaveTextContent('Complete period');
});

it('shows local clock times for hourly data from the backend local start', () => {
  const { container } = render(
    <ActivityChart
      buckets={hourly(
        [0, 1, 2, 3].map((hour) => ({
          key: `2026-10-10T0${hour}:00:00Z`,
          label: `Oct 10, ${hour === 0 ? 12 : hour}:00 AM UTC`,
          localStart: `2026-10-10T0${hour}:00:00+00:00`,
          count: hour,
        })),
      )}
    />,
  );

  expect(xLabels(container)).toEqual([
    ['12 AM', 'Oct 10'],
    ['1 AM'],
    ['2 AM'],
    ['3 AM'],
  ]);
});

it('shows an empty state without an SVG', () => {
  const { container } = render(<ActivityChart buckets={[]} />);

  expect(screen.getByText('No activity data for this period.')).toBeVisible();
  expect(container.querySelector('svg')).toBeNull();
});

it('draws a flat zero line with a clear message when all counts are zero', () => {
  const { container } = render(<ActivityChart buckets={daily([0, 0, 0])} />);

  expect(
    screen.getByText('No events were recorded in this period.'),
  ).toBeInTheDocument();
  expect(
    Array.from(container.querySelectorAll('text[data-axis="y"]')).map(
      (node) => node.textContent,
    ),
  ).toEqual(['0', '1', '2', '3', '4']);

  const ys = Array.from(container.querySelectorAll('circle')).map((c) =>
    c.getAttribute('cy'),
  );

  expect(new Set(ys).size).toBe(1);
  expect(svg(container).outerHTML).not.toMatch(/NaN|Infinity/);
});

it('does not exaggerate very low counts', () => {
  const { container } = render(<ActivityChart buckets={daily([0, 1, 0])} />);
  const cys = Array.from(container.querySelectorAll('circle')).map((c) =>
    Number(c.getAttribute('cy')),
  );
  const top = Math.min(
    ...Array.from(container.querySelectorAll('line')).map((line) =>
      Number(line.getAttribute('y1')),
    ),
  );
  const baseline = cys[0];

  // One event reaches a quarter of the plot height, not the full height.
  expect((baseline - cys[1]) / (baseline - top)).toBeCloseTo(0.25, 2);
});

it('draws a single bucket as one centred marker', () => {
  const { container } = render(<ActivityChart buckets={daily([3])} />);

  expect(container.querySelectorAll('circle')).toHaveLength(1);
  expect(container.querySelector('path[data-line]')).toBeNull();
  expect(svg(container).outerHTML).not.toMatch(/NaN|Infinity/);
  expect(
    screen.getByText('3 events in total. Busiest: Oct 1, 3.'),
  ).toBeInTheDocument();
});

it('uses compact axis labels and full numbers in text for very large counts', () => {
  const { container } = render(
    <ActivityChart buckets={daily([1_200_000, 2_500_000_000, 40])} />,
  );

  expect(
    Array.from(container.querySelectorAll('text[data-axis="y"]')).map(
      (node) => node.textContent,
    ),
  ).toEqual(['0', '1B', '2B', '3B']);
  expect(
    screen.getByText(
      '2,501,200,040 events in total. Busiest: Oct 2, 2,500,000,000.',
    ),
  ).toBeInTheDocument();
  expect(svg(container).outerHTML).not.toMatch(/NaN|Infinity/);
});

it('handles 90 buckets with sparse labels and no per-point markers', () => {
  const counts = Array.from({ length: 90 }, (_, index) => (index * 7) % 23);
  const buckets = counts.map((count, index) =>
    bucket(index, {
      key: `k${index}`,
      label: `Day ${index + 1}`,
      localStart: `2026-07-${String((index % 28) + 1).padStart(2, '0')}T00:00:00+00:00`,
      count,
    }),
  );
  const { container } = render(<ActivityChart buckets={buckets} />);

  expect(xLabels(container).length).toBeLessThanOrEqual(7);
  expect(container.querySelectorAll('circle')).toHaveLength(0);
  expect(tableRows()).toHaveLength(91);
  expect(svg(container).outerHTML).not.toMatch(/NaN|Infinity/);
});

it('marks partial buckets with a dashed line, a hollow marker, and a legend', () => {
  const buckets = daily([4, 6, 3]);
  buckets[2] = { ...buckets[2], partial: true };

  const { container } = render(<ActivityChart buckets={buckets} />);

  expect(container.querySelector('path[data-line="partial"]')).toHaveAttribute(
    'stroke-dasharray',
    '5 4',
  );
  expect(container.querySelector('path[data-line="solid"]')).not.toBeNull();
  expect(container.querySelector('circle[data-point="partial"]')).toHaveClass(
    'fill-surface',
  );
  expect(
    container.querySelectorAll('circle[data-point="complete"]'),
  ).toHaveLength(2);
  expect(screen.getByText(/Dashed line and hollow marker/)).toBeInTheDocument();
  expect(tableRows()[3]).toHaveTextContent('Partial period');
});

it('keeps both occurrences of a repeated fall-back hour', () => {
  const buckets = hourly([
    {
      key: '2026-11-01T07:00:00Z',
      label: 'Nov 1, 12:00 AM PDT',
      localStart: '2026-11-01T00:00:00-07:00',
      count: 1,
    },
    {
      key: '2026-11-01T08:00:00Z',
      label: 'Nov 1, 1:00 AM PDT',
      localStart: '2026-11-01T01:00:00-07:00',
      count: 4,
    },
    {
      key: '2026-11-01T09:00:00Z',
      label: 'Nov 1, 1:00 AM PST',
      localStart: '2026-11-01T01:00:00-08:00',
      count: 6,
    },
    {
      key: '2026-11-01T10:00:00Z',
      label: 'Nov 1, 2:00 AM PST',
      localStart: '2026-11-01T02:00:00-08:00',
      count: 2,
    },
  ]);
  const { container } = render(<ActivityChart buckets={buckets} />);
  const rows = tableRows();

  expect(rows).toHaveLength(5);
  expect(rows[2]).toHaveTextContent('Nov 1, 1:00 AM PDT');
  expect(rows[3]).toHaveTextContent('Nov 1, 1:00 AM PST');
  expect(container.querySelectorAll('circle')).toHaveLength(4);
  // The two 1 AM ticks stay distinguishable by offset.
  const labels = xLabels(container).map((lines) => lines.join(' '));
  expect(labels).toContain('1 AM (-07:00)');
  expect(labels).toContain('1 AM (-08:00)');
});

it('tells apart identical backend labels using the UTC offset', () => {
  const buckets = hourly([
    {
      key: '2026-11-01T08:00:00Z',
      label: 'Nov 1, 1:00 AM',
      localStart: '2026-11-01T01:00:00-07:00',
      count: 4,
    },
    {
      key: '2026-11-01T09:00:00Z',
      label: 'Nov 1, 1:00 AM',
      localStart: '2026-11-01T01:00:00-08:00',
      count: 6,
    },
  ]);

  render(<ActivityChart buckets={buckets} />);

  expect(tableRows()[1]).toHaveTextContent('Nov 1, 1:00 AM (UTC-07:00)');
  expect(tableRows()[2]).toHaveTextContent('Nov 1, 1:00 AM (UTC-08:00)');
});

it('does not invent a skipped spring-forward hour', () => {
  const buckets = hourly(
    [
      ['2026-03-08T08:00:00Z', '12:00 AM PST', '2026-03-08T00:00:00-08:00'],
      ['2026-03-08T09:00:00Z', '1:00 AM PST', '2026-03-08T01:00:00-08:00'],
      ['2026-03-08T10:00:00Z', '3:00 AM PDT', '2026-03-08T03:00:00-07:00'],
      ['2026-03-08T11:00:00Z', '4:00 AM PDT', '2026-03-08T04:00:00-07:00'],
    ].map(([key, time, localStart], index) => ({
      key,
      label: `Mar 8, ${time}`,
      localStart,
      count: index + 1,
    })),
  );
  const { container } = render(<ActivityChart buckets={buckets} />);

  expect(tableRows()).toHaveLength(5);
  expect(screen.queryByText(/\b2:00 AM/)).toBeNull();
  expect(xLabels(container).map((lines) => lines[0])).toEqual([
    '12 AM',
    '1 AM',
    '3 AM',
    '4 AM',
  ]);

  // Evenly spaced positions: a missing hour does not leave a gap.
  const xs = Array.from(container.querySelectorAll('circle')).map((c) =>
    Number(c.getAttribute('cx')),
  );
  expect(xs[1] - xs[0]).toBeCloseTo(xs[2] - xs[1], 1);
});

it('uses the local clock for non-whole-hour offsets without shifting it', () => {
  const buckets = hourly([
    {
      key: '2026-10-14T08:30:00Z',
      label: 'Oct 14, 2:15 PM +0545',
      localStart: '2026-10-14T14:15:00+05:45',
      count: 1,
      partial: true,
    },
    {
      key: '2026-10-14T09:15:00Z',
      label: 'Oct 14, 3:00 PM +0545',
      localStart: '2026-10-14T15:00:00+05:45',
      count: 3,
    },
    {
      key: '2026-10-14T10:15:00Z',
      label: 'Oct 14, 4:00 PM +0545',
      localStart: '2026-10-14T16:00:00+05:45',
      count: 2,
    },
  ]);
  const { container } = render(<ActivityChart buckets={buckets} />);

  expect(xLabels(container).map((lines) => lines.join(' '))).toEqual([
    '2:15 PM Oct 14',
    '3 PM',
    '4 PM',
  ]);
});

it('handles long labels, unparseable local starts, and bad counts safely', () => {
  const longLabel = `Checkout window ${'very long '.repeat(8)}end`;
  const buckets = [
    bucket(0, {
      label: longLabel,
      localStart: 'not a date',
      count: Number.NaN,
    }),
    bucket(1, { count: -3 }),
    bucket(2, { count: Number.POSITIVE_INFINITY }),
  ];
  const { container } = render(<ActivityChart buckets={buckets} />);

  expect(tableRows()[1]).toHaveTextContent(longLabel);
  expect(svg(container).outerHTML).not.toMatch(/NaN|Infinity|undefined/);
  expect(
    screen.getByText('No events were recorded in this period.'),
  ).toBeInTheDocument();
});

it('produces only valid finite SVG coordinates', () => {
  const buckets = daily([0, 3, 9, 1, 0, 27, 4]);
  buckets[6] = { ...buckets[6], partial: true };
  const { container } = render(<ActivityChart buckets={buckets} />);
  const markup = svg(container).outerHTML;

  expect(markup).not.toMatch(/NaN|Infinity|undefined|null/);

  for (const path of container.querySelectorAll('path')) {
    expect(path.getAttribute('d')).toMatch(/^[MLZ0-9. -]+$/);
  }

  for (const circle of container.querySelectorAll('circle')) {
    expect(Number.isFinite(Number(circle.getAttribute('cx')))).toBe(true);
    expect(Number.isFinite(Number(circle.getAttribute('cy')))).toBe(true);
  }

  const viewBox = svg(container).getAttribute('viewBox') ?? '';
  const [, , width, height] = viewBox.split(' ').map(Number);

  for (const circle of container.querySelectorAll('circle')) {
    expect(Number(circle.getAttribute('cx'))).toBeGreaterThan(0);
    expect(Number(circle.getAttribute('cx'))).toBeLessThanOrEqual(width);
    expect(Number(circle.getAttribute('cy'))).toBeGreaterThan(0);
    expect(Number(circle.getAttribute('cy'))).toBeLessThanOrEqual(height);
  }
});

it('uses theme tokens only, so light and dark themes both work', () => {
  const buckets = daily([1, 4, 2]);
  buckets[2] = { ...buckets[2], partial: true };
  const { container } = render(<ActivityChart buckets={buckets} />);
  const markup = container.innerHTML;

  expect(markup).toContain('stroke-accent');
  expect(markup).toContain('stroke-line');
  expect(markup).toContain('fill-muted');
  expect(markup).toContain('fill-surface');
  expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  expect(markup).not.toMatch(/\sstyle=/);
  expect(markup).not.toMatch(/animate|transition/);
});

it('is responsive through a viewBox with a scrollable minimum width', () => {
  const { container } = render(<ActivityChart buckets={daily([1, 2])} />);

  expect(svg(container)).toHaveAttribute('viewBox', '0 0 560 280');
  expect(svg(container)).toHaveClass('w-full', 'h-auto');
  expect(container.querySelector('[role="group"]')).toHaveClass(
    'overflow-x-auto',
  );
});
