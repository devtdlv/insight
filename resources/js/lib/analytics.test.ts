import { describe, expect, it } from 'vitest';
import {
  compareMetric,
  describeComparison,
  formatCompactCount,
  formatCount,
  formatDateSpan,
  formatPercentChange,
  formatRangeLabel,
  formatRatio,
  formatShare,
  hasComparisonWindow,
  isAnalyticsData,
  normalizePreset,
} from './analytics.ts';
import type {
  AnalyticsRange,
  ProjectAnalyticsData,
} from '../types/analytics.ts';

const range = (overrides: Partial<AnalyticsRange> = {}): AnalyticsRange => ({
  preset: '7d',
  timezone: 'Asia/Manila',
  localFrom: '2026-10-08',
  localTo: '2026-10-14',
  granularity: 'day',
  inProgress: true,
  ...overrides,
});

const metrics = {
  totalEvents: 0,
  uniqueVisitors: 0,
  identifiedUsers: 0,
  eventsPerVisitor: null,
};

const analytics = (): ProjectAnalyticsData => ({
  range: range(),
  currentPeriod: { start: '2026-10-07T16:00:00Z', end: '2026-10-14T12:00:00Z' },
  comparisonPeriod: {
    start: '2026-09-30T16:00:00Z',
    end: '2026-10-07T12:00:00Z',
  },
  current: metrics,
  previous: metrics,
  activity: [],
  topEvents: [],
});

describe('number formatting', () => {
  it('formats counts with grouping and no decimals', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(12480)).toBe('12,480');
    expect(formatCount(1234.6)).toBe('1,235');
  });

  it('formats compact axis counts', () => {
    expect(formatCompactCount(0)).toBe('0');
    expect(formatCompactCount(950)).toBe('950');
    expect(formatCompactCount(1200)).toBe('1.2K');
    expect(formatCompactCount(3_000_000)).toBe('3M');
    expect(formatCompactCount(Number.NaN)).toBe('-');
  });

  it('never prints NaN or Infinity', () => {
    expect(formatCount(Number.NaN)).toBe('-');
    expect(formatCount(Number.POSITIVE_INFINITY)).toBe('-');
    expect(formatRatio(Number.NaN)).toBe('-');
    expect(formatRatio(Number.POSITIVE_INFINITY)).toBe('-');
    expect(formatPercentChange(Number.POSITIVE_INFINITY)).toBe('-');
    expect(formatShare(Number.NaN)).toBe('0%');
  });

  it('formats events per visitor and shows a dash for null', () => {
    expect(formatRatio(null)).toBe('-');
    expect(formatRatio(0)).toBe('0');
    expect(formatRatio(2)).toBe('2');
    expect(formatRatio(4 / 3)).toBe('1.33');
  });

  it('formats shares of total events', () => {
    expect(formatShare(0)).toBe('0%');
    expect(formatShare(0.5)).toBe('50%');
    expect(formatShare(1 / 3)).toBe('33.3%');
    expect(formatShare(0.0004)).toBe('<0.1%');
    expect(formatShare(1.5)).toBe('100%');
    expect(formatShare(-1)).toBe('0%');
  });

  it('formats percent change magnitudes', () => {
    expect(formatPercentChange(0.125)).toBe('12.5%');
    expect(formatPercentChange(-0.125)).toBe('12.5%');
    expect(formatPercentChange(12.5)).toBe('1,250%');
    expect(formatPercentChange(0.0001)).toBe('<0.1%');
    expect(formatPercentChange(0)).toBe('0%');
  });
});

describe('compareMetric', () => {
  it('detects increases and decreases with a percent', () => {
    expect(compareMetric(125, 100)).toEqual({
      kind: 'increase',
      change: 25,
      percent: 0.25,
    });
    expect(compareMetric(50, 100)).toEqual({
      kind: 'decrease',
      change: 50,
      percent: 0.5,
    });
  });

  it('treats equal values as a genuine no change, including 0 and 0', () => {
    expect(compareMetric(10, 10)).toEqual({ kind: 'unchanged' });
    expect(compareMetric(0, 0)).toEqual({ kind: 'unchanged' });
    expect(compareMetric(0.1 + 0.2, 0.3)).toEqual({ kind: 'unchanged' });
  });

  it('handles previous = 0 without dividing by zero', () => {
    const result = compareMetric(5, 0);

    expect(result).toEqual({ kind: 'increase', change: 5, percent: null });
    expect(JSON.stringify(result)).not.toMatch(/Infinity|NaN/);
  });

  it('handles current = 0 as a full decrease', () => {
    expect(compareMetric(0, 8)).toEqual({
      kind: 'decrease',
      change: 8,
      percent: 1,
    });
  });

  it('is unavailable for null ratios, bad numbers, or an unavailable window', () => {
    expect(compareMetric(null, 2)).toEqual({ kind: 'unavailable' });
    expect(compareMetric(2, null)).toEqual({ kind: 'unavailable' });
    expect(compareMetric(null, null)).toEqual({ kind: 'unavailable' });
    expect(compareMetric(Number.NaN, 1)).toEqual({ kind: 'unavailable' });
    expect(compareMetric(1, Number.POSITIVE_INFINITY)).toEqual({
      kind: 'unavailable',
    });
    expect(compareMetric(5, 3, false)).toEqual({ kind: 'unavailable' });
  });

  it('keeps unavailable distinct from a genuine 0% change', () => {
    expect(compareMetric(0, 0)).not.toEqual(compareMetric(null, 0));
  });
});

describe('describeComparison', () => {
  it('describes increases and decreases neutrally', () => {
    const up = describeComparison(compareMetric(125, 100), { previous: 100 });
    const down = describeComparison(compareMetric(50, 100));

    expect(up).toEqual({
      arrow: '↑',
      text: '25%',
      description:
        'Up 25% compared with the previous period (previous period: 100).',
    });
    expect(down.arrow).toBe('↓');
    expect(down.description).toBe(
      'Down 50% compared with the previous period.',
    );
  });

  it('describes a change from zero without a percent', () => {
    expect(describeComparison(compareMetric(5, 0))).toEqual({
      arrow: '',
      text: 'No baseline',
      description:
        'No percentage change is available because the previous period was 0. The current value is 5.',
    });
  });

  it('describes no change and unavailable comparisons differently', () => {
    expect(describeComparison({ kind: 'unchanged' }).text).toBe('No change');
    expect(describeComparison({ kind: 'unavailable' })).toEqual({
      arrow: '',
      text: 'No comparison',
      description: 'No comparison with the previous period is available.',
    });
  });

  it('uses a custom value formatter', () => {
    const display = describeComparison(compareMetric(3, 0), {
      format: (value) => `${value.toFixed(1)}x`,
    });

    expect(display.text).toBe('No baseline');
    expect(display.description).toContain('3.0x');
  });
});

describe('range labels', () => {
  it('formats a date span from calendar dates without shifting them', () => {
    expect(formatDateSpan('2026-10-08', '2026-10-14')).toBe(
      'Oct 8, 2026 to Oct 14, 2026',
    );
    expect(formatDateSpan('2026-03-08', '2026-03-08')).toBe('Mar 8, 2026');
  });

  it('labels each preset and custom ranges', () => {
    expect(formatRangeLabel(range())).toBe(
      'Last 7 days (Oct 8, 2026 to Oct 14, 2026)',
    );
    expect(formatRangeLabel(range({ preset: '24h' }))).toBe('Last 24 hours');
    expect(
      formatRangeLabel(
        range({
          preset: 'custom',
          localFrom: '2026-10-01',
          localTo: '2026-10-03',
        }),
      ),
    ).toBe('Oct 1, 2026 to Oct 3, 2026');
  });

  it('falls back to the default preset for unknown values', () => {
    expect(normalizePreset('bogus')).toBe('7d');
    expect(normalizePreset(undefined)).toBe('7d');
    expect(normalizePreset('90d')).toBe('90d');
  });
});

describe('analytics payload checks', () => {
  it('detects an empty comparison window', () => {
    expect(hasComparisonWindow(analytics())).toBe(true);

    const empty = analytics();
    empty.comparisonPeriod = {
      start: '2026-10-12T16:00:00Z',
      end: '2026-10-12T16:00:00Z',
    };

    expect(hasComparisonWindow(empty)).toBe(false);
  });

  it('accepts a valid payload and rejects invalid server responses', () => {
    expect(isAnalyticsData(analytics())).toBe(true);
    expect(isAnalyticsData(null)).toBe(false);
    expect(isAnalyticsData(undefined)).toBe(false);
    expect(isAnalyticsData('analytics')).toBe(false);
    expect(isAnalyticsData({})).toBe(false);
    expect(isAnalyticsData({ ...analytics(), topEvents: null })).toBe(false);
    expect(
      isAnalyticsData({ ...analytics(), range: { ...range(), preset: '14d' } }),
    ).toBe(false);
  });
});
