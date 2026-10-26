<?php

namespace App\Support\Analytics;

use Carbon\CarbonImmutable;
use DateTimeInterface;
use DateTimeZone;
use InvalidArgumentException;
use Throwable;

/**
 * Turns request-style input (range preset, optional custom dates) into a
 * DateRange for one project timezone.
 *
 * A controller or form request calls validate() to get per-field messages
 * (keys: range, from, to), then resolve() to build the range.
 *
 * Policies:
 * - Default preset is 7d.
 * - Empty-string range falls back to the default.
 * - from/to are ignored for presets and required for custom.
 * - Custom dates are local calendar dates, strict YYYY-MM-DD, from <= to,
 *   at most 90 dates, and never after today in the project timezone.
 * - There is no lower date limit.
 */
final class DateRangeResolver
{
    public const DEFAULT_RANGE = '7d';

    public const CUSTOM = 'custom';

    public const MAX_CUSTOM_DAYS = 90;

    /** Custom ranges of this many local dates or fewer use hourly buckets. */
    public const HOURLY_MAX_DAYS = 2;

    private const DAY_PRESETS = ['7d' => 7, '30d' => 30, '90d' => 90];

    private const KEY_FORMAT = 'Y-m-d\TH:i:s\Z';

    /** @return list<string> */
    public static function presets(): array
    {
        return ['24h', ...array_keys(self::DAY_PRESETS), self::CUSTOM];
    }

    /**
     * @return array<string, string> Field => message. Empty when valid.
     */
    public function validate(string $timezone, ?string $range = null, ?string $from = null, ?string $to = null, ?DateTimeInterface $now = null): array
    {
        $this->assertTimezone($timezone);

        $preset = $this->presetFrom($range);

        if (! in_array($preset, self::presets(), true)) {
            return ['range' => 'Choose one of: '.implode(', ', self::presets()).'.'];
        }

        if ($preset !== self::CUSTOM) {
            return [];
        }

        $errors = [];
        $fromDate = $this->parseDate($from);
        $toDate = $this->parseDate($to);

        if ($from === null || $from === '') {
            $errors['from'] = 'Enter a start date.';
        } elseif ($fromDate === null) {
            $errors['from'] = 'Use the format YYYY-MM-DD for the start date.';
        }

        if ($to === null || $to === '') {
            $errors['to'] = 'Enter an end date.';
        } elseif ($toDate === null) {
            $errors['to'] = 'Use the format YYYY-MM-DD for the end date.';
        }

        if ($errors !== []) {
            return $errors;
        }

        /** @var CarbonImmutable $fromDate */
        /** @var CarbonImmutable $toDate */
        $today = $this->normalizeNow($now)->setTimezone($timezone)->format('Y-m-d');

        if ($fromDate > $toDate) {
            return ['to' => 'The end date must be on or after the start date.'];
        }

        if ($fromDate->format('Y-m-d') > $today) {
            $errors['from'] = 'The start date cannot be in the future.';
        }

        if ($toDate->format('Y-m-d') > $today) {
            $errors['to'] = 'The end date cannot be in the future.';
        }

        if ($errors === [] && $this->dayCount($fromDate, $toDate) > self::MAX_CUSTOM_DAYS) {
            $errors['to'] = 'The range can cover at most '.self::MAX_CUSTOM_DAYS.' days.';
        }

        return $errors;
    }

    /**
     * @throws InvalidArgumentException When the input is invalid. Call validate() first for field messages.
     */
    public function resolve(string $timezone, ?string $range = null, ?string $from = null, ?string $to = null, ?DateTimeInterface $now = null): DateRange
    {
        $errors = $this->validate($timezone, $range, $from, $to, $now);

        if ($errors !== []) {
            throw new InvalidArgumentException((string) reset($errors));
        }

        $now = $this->normalizeNow($now);
        $preset = $this->presetFrom($range);

        if ($preset === '24h') {
            return $this->rolling24Hours($timezone, $now);
        }

        if ($preset === self::CUSTOM) {
            /** @var CarbonImmutable $first */
            $first = $this->parseDate($from);
            /** @var CarbonImmutable $last */
            $last = $this->parseDate($to);
        } else {
            $last = CarbonImmutable::createFromFormat('!Y-m-d', $now->setTimezone($timezone)->format('Y-m-d'), 'UTC');
            $first = $last->subDays(self::DAY_PRESETS[$preset] - 1);
        }

        return $this->calendarRange($preset, $timezone, $now, $first, $last);
    }

    private function rolling24Hours(string $timezone, CarbonImmutable $now): DateRange
    {
        $start = $now->subSeconds(86400);
        $previous = ['start' => $start->subSeconds(86400), 'end' => $start];

        return new DateRange(
            preset: '24h',
            timezone: $timezone,
            localFrom: $start->setTimezone($timezone)->format('Y-m-d'),
            localTo: $now->setTimezone($timezone)->format('Y-m-d'),
            startUtc: $start,
            endUtc: $now,
            effectiveEndUtc: $now,
            granularity: DateRange::GRANULARITY_HOUR,
            buckets: $this->hourBuckets($start, $now, $timezone),
            calendarComparison: $previous,
            elapsedComparison: $previous,
        );
    }

    private function calendarRange(string $preset, string $timezone, CarbonImmutable $now, CarbonImmutable $first, CarbonImmutable $last): DateRange
    {
        $days = $this->dayCount($first, $last);
        $start = $this->localMidnight($first, $timezone);
        $end = $this->localMidnight($last->addDays(1), $timezone);
        $effectiveEnd = $now < $end ? $now : $end;

        $previousStart = $this->localMidnight($first->subDays($days), $timezone);
        $calendar = ['start' => $previousStart, 'end' => $start];

        if ($effectiveEnd >= $end) {
            $elapsed = $calendar;
        } else {
            // The range includes today. End the previous window at the same local
            // wall-clock time on the corresponding date of the previous period
            // (today minus the number of dates in the range).
            $candidate = $this->wallClockToUtc(
                $last->subDays($days)->format('Y-m-d'),
                $effectiveEnd->setTimezone($timezone)->format('H:i:s'),
                $timezone,
            );
            $elapsed = [
                'start' => $previousStart,
                'end' => min(max($candidate, $previousStart), $start),
            ];
        }

        $hourly = $preset === self::CUSTOM && $days <= self::HOURLY_MAX_DAYS;

        return new DateRange(
            preset: $preset,
            timezone: $timezone,
            localFrom: $first->format('Y-m-d'),
            localTo: $last->format('Y-m-d'),
            startUtc: $start,
            endUtc: $end,
            effectiveEndUtc: $effectiveEnd,
            granularity: $hourly ? DateRange::GRANULARITY_HOUR : DateRange::GRANULARITY_DAY,
            buckets: $hourly
                ? $this->hourBuckets($start, $effectiveEnd, $timezone)
                : $this->dayBuckets($first, $days, $timezone, $effectiveEnd),
            calendarComparison: $calendar,
            elapsedComparison: $elapsed,
        );
    }

    /**
     * One bucket per local calendar date, clipped to the effective end so no
     * bucket reaches into the future. DST days are 23, 24.5, 25 hours etc.
     *
     * @return list<array{key: string, start: CarbonImmutable, end: CarbonImmutable, label: string, localStart: string, partial: bool}>
     */
    private function dayBuckets(CarbonImmutable $first, int $days, string $timezone, CarbonImmutable $effectiveEnd): array
    {
        $buckets = [];
        $start = $this->localMidnight($first, $timezone);

        for ($i = 0; $i < $days && $start < $effectiveEnd; $i++) {
            $date = $first->addDays($i);
            $naturalEnd = $this->localMidnight($date->addDays(1), $timezone);
            $end = min($naturalEnd, $effectiveEnd);

            $buckets[] = $this->bucket($start, $end, $date->format('M j'), $timezone, $naturalEnd > $effectiveEnd);
            $start = $naturalEnd;
        }

        return $buckets;
    }

    /**
     * Buckets begin at every instant whose local wall clock reads exactly :00:00
     * (plus the range start), stepped through UTC instants. A repeated local
     * hour yields two buckets with different UTC keys. A skipped local hour
     * yields none, so a bucket may span a gap and exceed one hour. Offsets of
     * 30 or 45 minutes get boundaries at their own local :00. The last bucket
     * is clipped to the effective end, and the first is clipped when the range
     * start is not on a local hour (rolling 24h).
     *
     * @return list<array{key: string, start: CarbonImmutable, end: CarbonImmutable, label: string, localStart: string, partial: bool}>
     */
    private function hourBuckets(CarbonImmutable $start, CarbonImmutable $effectiveEnd, string $timezone): array
    {
        $buckets = [];
        $cursor = $start;

        while ($cursor < $effectiveEnd) {
            $natural = $this->nextLocalHour($cursor, $timezone);
            $local = $cursor->setTimezone($timezone);
            $clippedStart = $cursor == $start && ($local->minute !== 0 || $local->second !== 0);

            $buckets[] = $this->bucket(
                $cursor,
                min($natural, $effectiveEnd),
                $local->format('M j, g:i A T'),
                $timezone,
                $clippedStart || $natural > $effectiveEnd,
            );

            $cursor = $natural;
        }

        return $buckets;
    }

    /**
     * The first instant strictly after $instant whose local wall clock reads
     * exactly :00:00. Offset changes between the two are found from the zone's
     * transition table, so 30 minute DST shifts (Australia/Lord_Howe) work.
     */
    private function nextLocalHour(CarbonImmutable $instant, string $timezone): CarbonImmutable
    {
        $zone = new DateTimeZone($timezone);
        $from = $instant;

        while (true) {
            $local = $from->setTimezone($zone);
            $candidate = $from->addSeconds(3600 - ($local->minute * 60 + $local->second));
            $transition = $this->firstTransition($zone, $from, $candidate);

            if ($transition === null) {
                return $candidate;
            }

            $after = $transition->setTimezone($zone);

            if ($after->minute === 0 && $after->second === 0) {
                return $transition;
            }

            $from = $transition;
        }
    }

    /** The first UTC offset change in ($from, $to], or null. */
    private function firstTransition(DateTimeZone $zone, CarbonImmutable $from, CarbonImmutable $to): ?CarbonImmutable
    {
        foreach ($zone->getTransitions($from->getTimestamp(), $to->getTimestamp()) as $transition) {
            if ($transition['ts'] > $from->getTimestamp() && $transition['ts'] <= $to->getTimestamp()) {
                return CarbonImmutable::createFromTimestampUTC($transition['ts']);
            }
        }

        return null;
    }

    /**
     * @return array{key: string, start: CarbonImmutable, end: CarbonImmutable, label: string, localStart: string, partial: bool}
     */
    private function bucket(CarbonImmutable $start, CarbonImmutable $end, string $label, string $timezone, bool $partial): array
    {
        return [
            'key' => $start->format(self::KEY_FORMAT),
            'start' => $start,
            'end' => $end,
            'label' => $label,
            'localStart' => $start->setTimezone($timezone)->toIso8601String(),
            'partial' => $partial,
        ];
    }

    /** UTC instant of the start of a local calendar date. */
    private function localMidnight(CarbonImmutable $date, string $timezone): CarbonImmutable
    {
        return $this->wallClockToUtc($date->format('Y-m-d'), '00:00:00', $timezone);
    }

    /**
     * Converts a local date and time to a UTC instant. Deterministic policy:
     * - A nonexistent local time (DST gap) moves forward by the length of the
     *   gap, so 02:30 on a spring-forward day becomes 03:30.
     * - An ambiguous local time (DST overlap) resolves to its first occurrence,
     *   the earlier instant, so 01:30 on a fall-back day is the pre-change one.
     * Both rules are PHP's native resolution and are pinned by tests.
     */
    private function wallClockToUtc(string $date, string $time, string $timezone): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('!Y-m-d H:i:s', "{$date} {$time}", $timezone)->utc();
    }

    private function dayCount(CarbonImmutable $first, CarbonImmutable $last): int
    {
        return intdiv($last->getTimestamp() - $first->getTimestamp(), 86400) + 1;
    }

    private function presetFrom(?string $range): string
    {
        return $range === null || $range === '' ? self::DEFAULT_RANGE : $range;
    }

    /** Strict YYYY-MM-DD as a UTC calendar-date holder, or null. */
    private function parseDate(?string $value): ?CarbonImmutable
    {
        if ($value === null || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', $value, 'UTC');
        } catch (Throwable) {
            return null;
        }

        return $date instanceof CarbonImmutable && $date->format('Y-m-d') === $value ? $date : null;
    }

    private function normalizeNow(?DateTimeInterface $now): CarbonImmutable
    {
        $instant = $now === null ? CarbonImmutable::now() : CarbonImmutable::instance($now);

        return $instant->utc()->setMicrosecond(0);
    }

    private function assertTimezone(string $timezone): void
    {
        if (! in_array($timezone, timezone_identifiers_list(), true)) {
            throw new InvalidArgumentException("Unknown timezone [{$timezone}].");
        }
    }
}
