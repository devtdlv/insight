import { describe, expect, it } from 'vitest';
import {
  formatLocalDate,
  inclusiveDays,
  isIsoDate,
  todayInTimezone,
  validateCustomRange,
} from './dateRange.ts';

describe('todayInTimezone', () => {
  const instant = new Date('2026-10-14T20:00:00Z');

  it('uses the project timezone, not the browser timezone', () => {
    expect(todayInTimezone('UTC', instant)).toBe('2026-10-14');
    expect(todayInTimezone('Asia/Manila', instant)).toBe('2026-10-15');
    expect(todayInTimezone('America/Los_Angeles', instant)).toBe('2026-10-14');
    expect(todayInTimezone('Asia/Kathmandu', instant)).toBe('2026-10-15');
  });

  it('follows DST offsets', () => {
    expect(
      todayInTimezone('America/Los_Angeles', new Date('2026-03-09T06:30:00Z')),
    ).toBe('2026-03-08');
    expect(
      todayInTimezone('America/Los_Angeles', new Date('2026-03-09T07:30:00Z')),
    ).toBe('2026-03-09');
  });

  it('falls back to UTC for an unknown timezone', () => {
    expect(todayInTimezone('Mars/Olympus', instant)).toBe('2026-10-14');
  });
});

describe('calendar date helpers', () => {
  it('validates strict YYYY-MM-DD dates', () => {
    expect(isIsoDate('2026-10-14')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-1-5')).toBe(false);
    expect(isIsoDate('10/14/2026')).toBe(false);
    expect(isIsoDate('')).toBe(false);
  });

  it('counts inclusive calendar days across DST changes', () => {
    expect(inclusiveDays('2026-10-14', '2026-10-14')).toBe(1);
    expect(inclusiveDays('2026-10-01', '2026-10-03')).toBe(3);
    expect(inclusiveDays('2026-03-07', '2026-03-09')).toBe(3);
    expect(inclusiveDays('2026-07-17', '2026-10-14')).toBe(90);
    expect(inclusiveDays('bad', '2026-10-14')).toBeNull();
  });

  it('formats a calendar date without shifting it', () => {
    expect(formatLocalDate('2026-03-08')).toBe('Mar 8, 2026');
    expect(formatLocalDate('2026-12-31')).toBe('Dec 31, 2026');
    expect(formatLocalDate('nonsense')).toBe('nonsense');
  });
});

describe('validateCustomRange', () => {
  const today = '2026-10-14';

  it('accepts valid ranges, including a single day and today', () => {
    expect(validateCustomRange('2026-10-01', '2026-10-03', today)).toEqual({});
    expect(validateCustomRange(today, today, today)).toEqual({});
    expect(validateCustomRange('2026-07-17', today, today)).toEqual({});
  });

  it('requires both dates', () => {
    expect(validateCustomRange('', '', today)).toEqual({
      from: 'Enter a start date.',
      to: 'Enter an end date.',
    });
    expect(validateCustomRange('2026-10-01', '', today)).toEqual({
      to: 'Enter an end date.',
    });
  });

  it('rejects malformed and impossible dates', () => {
    expect(validateCustomRange('10/01/2026', '2026-10-02', today).from).toMatch(
      /YYYY-MM-DD/,
    );
    expect(validateCustomRange('2026-02-30', '2026-10-02', today).from).toMatch(
      /YYYY-MM-DD/,
    );
  });

  it('rejects reversed dates', () => {
    expect(validateCustomRange('2026-10-05', '2026-10-01', today)).toEqual({
      to: 'The end date must be on or after the start date.',
    });
  });

  it('rejects future dates', () => {
    expect(validateCustomRange('2026-10-10', '2026-10-15', today)).toEqual({
      to: 'The end date cannot be in the future.',
    });
    expect(validateCustomRange('2026-10-15', '2026-10-16', today)).toEqual({
      from: 'The start date cannot be in the future.',
      to: 'The end date cannot be in the future.',
    });
  });

  it('rejects ranges over 90 calendar days', () => {
    expect(validateCustomRange('2026-07-16', today, today)).toEqual({
      to: 'The range can cover at most 90 days.',
    });
  });
});
