import type { AnalyticsRangeErrors } from '../types/analytics.ts';

export const MAX_RANGE_DAYS = 90;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

/**
 * Calendar dates are handled as UTC-midnight "date holders" only. They are
 * never converted through the browser timezone, so a date cannot shift.
 */
function toDateMs(value: string): number | null {
  if (!ISO_DATE.test(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);
  const ms = Date.UTC(year, month - 1, day);
  const date = new Date(ms);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return ms;
}

export function isIsoDate(value: string): boolean {
  return toDateMs(value) !== null;
}

/** Today's calendar date (YYYY-MM-DD) in the project timezone. */
export function todayInTimezone(timezone: string, now: Date): string {
  let parts: Intl.DateTimeFormatPart[];

  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
  }

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Inclusive number of calendar dates from `from` to `to`, or null if invalid. */
export function inclusiveDays(from: string, to: string): number | null {
  const start = toDateMs(from);
  const end = toDateMs(to);

  if (start === null || end === null) {
    return null;
  }

  return Math.round((end - start) / DAY_MS) + 1;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** "Oct 8, 2026" for a calendar date. Returns the input if it is not a date. */
export function formatLocalDate(value: string): string {
  const ms = toDateMs(value);

  return ms === null ? value : dateFormatter.format(new Date(ms));
}

/**
 * Client-side mirror of the server's custom-range rules, to give instant
 * feedback. The server stays the source of truth.
 */
export function validateCustomRange(
  from: string,
  to: string,
  today: string,
): AnalyticsRangeErrors {
  const errors: AnalyticsRangeErrors = {};

  if (from === '') {
    errors.from = 'Enter a start date.';
  } else if (!isIsoDate(from)) {
    errors.from = 'Use the format YYYY-MM-DD for the start date.';
  }

  if (to === '') {
    errors.to = 'Enter an end date.';
  } else if (!isIsoDate(to)) {
    errors.to = 'Use the format YYYY-MM-DD for the end date.';
  }

  if (errors.from || errors.to) {
    return errors;
  }

  if (from > to) {
    return { to: 'The end date must be on or after the start date.' };
  }

  if (from > today) {
    errors.from = 'The start date cannot be in the future.';
  }

  if (to > today) {
    errors.to = 'The end date cannot be in the future.';
  }

  if (
    !errors.from &&
    !errors.to &&
    (inclusiveDays(from, to) ?? 0) > MAX_RANGE_DAYS
  ) {
    errors.to = `The range can cover at most ${MAX_RANGE_DAYS} days.`;
  }

  return errors;
}
