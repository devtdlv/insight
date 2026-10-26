import type { AnalyticsActivityBucket } from '../types/analytics.ts';

export const MAX_X_TICKS = 7;

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Rounds to 2 decimals and guarantees a finite SVG coordinate. */
export function coord(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

/** Negative, NaN, and infinite counts are drawn as zero. */
export function safeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Integer y scale. Low counts get at least 4 steps so one event does not fill
 * the whole chart. The axis always starts at zero.
 */
export function niceScale(max: number): { top: number; step: number } {
  if (!Number.isFinite(max) || max <= 0) {
    return { top: 4, step: 1 };
  }

  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;
  const multiple =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const step = Math.max(1, multiple * magnitude);
  const top = Math.ceil(max / step) * step;

  return top < 4 ? { top: 4, step: 1 } : { top, step };
}

export type LocalParts = {
  date: string;
  month: string;
  day: number;
  hour: number;
  minute: number;
  offset: string;
};

/**
 * Reads the backend-supplied local wall clock text. This is string slicing of
 * the project-timezone value, never a Date parse, so nothing shifts to the
 * browser timezone.
 */
export function parseLocalStart(value: string): LocalParts | null {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    month: MONTHS[Number(match[2]) - 1] ?? '',
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    offset: match[6],
  };
}

/** "3 PM" or "5:45 PM". */
export function clockLabel(parts: LocalParts): string {
  const suffix = parts.hour < 12 ? 'AM' : 'PM';
  const hour = parts.hour % 12 === 0 ? 12 : parts.hour % 12;

  return parts.minute === 0
    ? `${hour} ${suffix}`
    : `${hour}:${String(parts.minute).padStart(2, '0')} ${suffix}`;
}

/**
 * Full labels for text and the data table. Backend labels are used as is.
 * If two buckets still share a label, the UTC offset tells them apart.
 */
export function uniqueLabels(buckets: AnalyticsActivityBucket[]): string[] {
  const counts = new Map<string, number>();

  for (const bucket of buckets) {
    counts.set(bucket.label, (counts.get(bucket.label) ?? 0) + 1);
  }

  return buckets.map((bucket) => {
    if ((counts.get(bucket.label) ?? 0) < 2) {
      return bucket.label;
    }

    const offset = parseLocalStart(bucket.localStart)?.offset;

    return offset ? `${bucket.label} (UTC${offset})` : bucket.label;
  });
}

export type XTick = { index: number; lines: string[] };

/**
 * Sparse x axis labels. Daily buckets use the backend label. Hourly buckets
 * show the local clock time, with the date on the first tick and whenever the
 * local date changes. A clock time that occurs twice on the same local date
 * (DST fall-back) carries its UTC offset.
 */
export function xTicks(
  buckets: AnalyticsActivityBucket[],
  hourly: boolean,
): XTick[] {
  const step = Math.max(1, Math.ceil((buckets.length - 1) / (MAX_X_TICKS - 1)));
  const seen = new Map<string, number>();

  const shorts = buckets.map((bucket) => {
    const parts = parseLocalStart(bucket.localStart);
    const text = hourly && parts ? clockLabel(parts) : bucket.label;
    const key = `${parts?.date ?? ''}|${text}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);

    return { parts, text, key };
  });

  const ticks: XTick[] = [];
  let previousDate: string | null = null;

  for (let index = 0; index < buckets.length; index += step) {
    const { parts, text, key } = shorts[index];

    if (!hourly || !parts) {
      ticks.push({ index, lines: [text] });
      continue;
    }

    const lines = [
      (seen.get(key) ?? 0) > 1 ? `${text} (${parts.offset})` : text,
    ];

    if (parts.date !== previousDate) {
      lines.push(`${parts.month} ${parts.day}`);
      previousDate = parts.date;
    }

    ticks.push({ index, lines });
  }

  return ticks;
}
