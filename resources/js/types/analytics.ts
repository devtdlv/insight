/**
 * Mirrors App\Services\Analytics\ProjectAnalyticsResult::toArray().
 * Aggregates only: no event IDs, visitor IDs, properties, or write keys.
 */

export type AnalyticsPreset = '24h' | '7d' | '30d' | '90d' | 'custom';

export type AnalyticsGranularity = 'hour' | 'day';

export type AnalyticsRange = {
  preset: AnalyticsPreset;
  /** Project IANA timezone. */
  timezone: string;
  /** Local calendar dates, YYYY-MM-DD. */
  localFrom: string;
  localTo: string;
  granularity: AnalyticsGranularity;
  inProgress: boolean;
};

/** Half-open [start, end) window as ISO-8601 UTC strings. */
export type AnalyticsPeriod = {
  start: string;
  end: string;
};

export type AnalyticsMetricSet = {
  totalEvents: number;
  uniqueVisitors: number;
  identifiedUsers: number;
  /** Null when there are no visitors. */
  eventsPerVisitor: number | null;
};

export type AnalyticsActivityBucket = {
  /** UTC start instant, unique per bucket. */
  key: string;
  start: string;
  end: string;
  label: string;
  /** ISO-8601 with the project timezone offset. */
  localStart: string;
  partial: boolean;
  count: number;
};

export type AnalyticsTopEvent = {
  name: string;
  count: number;
  /** Fraction of all events in the period, 0 to 1. */
  share: number;
};

export type ProjectAnalyticsData = {
  range: AnalyticsRange;
  currentPeriod: AnalyticsPeriod;
  comparisonPeriod: AnalyticsPeriod;
  current: AnalyticsMetricSet;
  previous: AnalyticsMetricSet;
  activity: AnalyticsActivityBucket[];
  topEvents: AnalyticsTopEvent[];
};

/** Laravel validation messages for the analytics query string. */
export type AnalyticsRangeErrors = Partial<
  Record<'range' | 'from' | 'to', string>
>;
