import type {
  AnalyticsPreset,
  AnalyticsRange,
  ProjectAnalyticsData,
} from '../types/analytics.ts';
import { formatLocalDate } from './dateRange.ts';

const UNAVAILABLE = '-';

const countFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});
const ratioFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});
const compactFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export const PRESET_LABELS: Record<AnalyticsPreset, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  custom: 'Custom range',
};

export function isAnalyticsPreset(value: unknown): value is AnalyticsPreset {
  return typeof value === 'string' && value in PRESET_LABELS;
}

/** Unknown presets fall back to the server default. */
export function normalizePreset(value: unknown): AnalyticsPreset {
  return isAnalyticsPreset(value) ? value : '7d';
}

/** Integer count such as 12,480. Non-finite input shows a dash. */
export function formatCount(value: number): string {
  return Number.isFinite(value) ? countFormat.format(value) : UNAVAILABLE;
}

/** Short count for chart axes such as 1.2K or 3M. */
export function formatCompactCount(value: number): string {
  return Number.isFinite(value) ? compactFormat.format(value) : UNAVAILABLE;
}

/** Events per visitor such as 3.42. Null (no visitors) shows a dash. */
export function formatRatio(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? UNAVAILABLE
    : ratioFormat.format(value);
}

/** Share of all events as a percentage. Tiny non-zero shares show "<0.1%". */
export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) {
    return percentFormat.format(0);
  }

  if (share < 0.001) {
    return '<0.1%';
  }

  return percentFormat.format(Math.min(share, 1));
}

/** Magnitude of a percent change (fraction), without a sign. */
export function formatPercentChange(fraction: number): string {
  if (!Number.isFinite(fraction)) {
    return UNAVAILABLE;
  }

  const magnitude = Math.abs(fraction);

  if (magnitude > 0 && magnitude < 0.001) {
    return '<0.1%';
  }

  return percentFormat.format(magnitude);
}

export type Comparison =
  | { kind: 'unavailable' }
  | { kind: 'unchanged' }
  | {
      kind: 'increase' | 'decrease';
      /** Absolute difference, always positive. */
      change: number;
      /** Fractional change, or null when the previous value was 0. */
      percent: number | null;
    };

const EPSILON = 1e-9;

/**
 * Compares a metric with the previous period.
 *
 * - Unavailable when a value is missing or not finite, or `available` is false
 *   (for example an empty comparison window).
 * - Unchanged is a genuine 0 change, including 0 versus 0.
 * - A previous value of 0 gives a change with no percent (never Infinity).
 *
 * The result says only whether the metric went up or down.
 */
export function compareMetric(
  current: number | null,
  previous: number | null,
  available = true,
): Comparison {
  if (
    !available ||
    current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous)
  ) {
    return { kind: 'unavailable' };
  }

  const difference = current - previous;

  if (Math.abs(difference) < EPSILON) {
    return { kind: 'unchanged' };
  }

  return {
    kind: difference > 0 ? 'increase' : 'decrease',
    change: Math.abs(difference),
    percent: previous === 0 ? null : Math.abs(difference) / Math.abs(previous),
  };
}

export type ComparisonDisplay = {
  arrow: '↑' | '↓' | '→' | '';
  /** Short visible text, without the arrow. */
  text: string;
  /** Full sentence for assistive technology. */
  description: string;
};

/**
 * Text for a comparison. `format` formats absolute values (counts by
 * default); `previous` adds the earlier value to the description.
 */
export function describeComparison(
  comparison: Comparison,
  options: {
    format?: (value: number) => string;
    previous?: number | null;
  } = {},
): ComparisonDisplay {
  const format = options.format ?? formatCount;

  if (comparison.kind === 'unavailable') {
    return {
      arrow: '',
      text: 'No comparison',
      description: 'No comparison with the previous period is available.',
    };
  }

  if (comparison.kind === 'unchanged') {
    return {
      arrow: '→',
      text: 'No change',
      description: 'No change compared with the previous period.',
    };
  }

  const direction = comparison.kind === 'increase' ? 'Up' : 'Down';
  const arrow = comparison.kind === 'increase' ? '↑' : '↓';
  const previous =
    options.previous === undefined || options.previous === null
      ? ''
      : ` (previous period: ${format(options.previous)})`;

  if (comparison.percent === null) {
    // An increase from 0 has no meaningful percentage and is not a growth
    // claim, so it gets no arrow and no figure.
    return {
      arrow: '',
      text: 'No baseline',
      description: `No percentage change is available because the previous period was 0. The current value is ${format(comparison.change)}.`,
    };
  }

  const text = formatPercentChange(comparison.percent);

  return {
    arrow,
    text,
    description: `${direction} ${text} compared with the previous period${previous}.`,
  };
}

/** "Oct 8, 2026 to Oct 14, 2026", or a single date. */
export function formatDateSpan(from: string, to: string): string {
  return from === to
    ? formatLocalDate(from)
    : `${formatLocalDate(from)} to ${formatLocalDate(to)}`;
}

/** "Last 7 days (Oct 8, 2026 to Oct 14, 2026)" using the server's local dates. */
export function formatRangeLabel(range: AnalyticsRange): string {
  const title = PRESET_LABELS[normalizePreset(range.preset)];

  if (range.preset === 'custom') {
    return formatDateSpan(range.localFrom, range.localTo);
  }

  if (range.preset === '24h') {
    return title;
  }

  return `${title} (${formatDateSpan(range.localFrom, range.localTo)})`;
}

/**
 * A comparison is only meaningful when the comparison window is not empty.
 */
export function hasComparisonWindow(analytics: ProjectAnalyticsData): boolean {
  const { start, end } = analytics.comparisonPeriod;

  return start !== end;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Structural check for the analytics prop before the UI trusts it. */
export function isAnalyticsData(value: unknown): value is ProjectAnalyticsData {
  if (!isRecord(value) || !isRecord(value.range)) {
    return false;
  }

  return (
    isAnalyticsPreset(value.range.preset) &&
    typeof value.range.timezone === 'string' &&
    typeof value.range.localFrom === 'string' &&
    typeof value.range.localTo === 'string' &&
    isRecord(value.currentPeriod) &&
    isRecord(value.comparisonPeriod) &&
    isRecord(value.current) &&
    isRecord(value.previous) &&
    Array.isArray(value.activity) &&
    Array.isArray(value.topEvents)
  );
}
