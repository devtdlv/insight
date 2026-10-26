<?php

namespace App\Support\Analytics;

use Carbon\CarbonImmutable;

/**
 * A resolved analytics date range.
 *
 * Every boundary is a UTC instant and every window is half-open: [start, end).
 * Query with `occurred_at >= start AND occurred_at < end`.
 *
 * Effective end
 * -------------
 * `effectiveEndUtc = min(endUtc, now)`. Aggregation must use it, for metric
 * cards and the activity chart alike, and must never query or show events after
 * it. It equals `endUtc` for a range that has fully ended and the current
 * instant for a range that includes today. `endUtc` is the nominal end of the
 * last local date and is informational only.
 *
 * Which windows metric cards should use
 * -------------------------------------
 * - Current value: count events in [startUtc, effectiveEndUtc).
 * - Previous value: count events in `elapsedComparison`.
 *   For ranges that include today, it ends at the same local wall-clock time on
 *   the corresponding date of the previous period (a 7d range ending Monday
 *   10:00 local compares with the 7 dates before it, ending the previous Monday
 *   10:00 local). A wall-clock time that does not exist (DST gap) moves forward
 *   by the gap length. An ambiguous one (DST overlap) takes its first
 *   occurrence. The `24h` preset is a rolling window and compares with the
 *   preceding 86,400 elapsed seconds.
 * - When the range has fully ended (inProgress() is false) elapsedComparison
 *   equals calendarComparison.
 * - `calendarComparison` is the full preceding period. Use it only where the UI
 *   labels the comparison as the full previous period.
 * - Comparison windows may be empty (start == end) when now is exactly at the
 *   start of the range.
 * - The activity chart plots `buckets`, which cover [startUtc, effectiveEndUtc)
 *   contiguously with no future buckets. Buckets that are not fully elapsed or
 *   are clipped at the start carry `partial = true`.
 *
 * Bucket keys are the UTC start instant (`Y-m-d\TH:i:s\Z`). They stay unique
 * when a local hour repeats at a DST fall-back, and an aggregation service can
 * count rows by exact UTC boundaries without SQL timezone conversion.
 *
 * @phpstan-type Window array{start: CarbonImmutable, end: CarbonImmutable}
 * @phpstan-type Bucket array{key: string, start: CarbonImmutable, end: CarbonImmutable, label: string, localStart: string, partial: bool}
 */
final readonly class DateRange
{
    public const GRANULARITY_HOUR = 'hour';

    public const GRANULARITY_DAY = 'day';

    /**
     * @param  list<array{key: string, start: CarbonImmutable, end: CarbonImmutable, label: string, localStart: string, partial: bool}>  $buckets
     * @param  array{start: CarbonImmutable, end: CarbonImmutable}  $calendarComparison
     * @param  array{start: CarbonImmutable, end: CarbonImmutable}  $elapsedComparison
     */
    public function __construct(
        public string $preset,
        public string $timezone,
        public string $localFrom,
        public string $localTo,
        public CarbonImmutable $startUtc,
        public CarbonImmutable $endUtc,
        public CarbonImmutable $effectiveEndUtc,
        public string $granularity,
        public array $buckets,
        public array $calendarComparison,
        public array $elapsedComparison,
    ) {}

    /** True when part of the range lies in the future. */
    public function inProgress(): bool
    {
        return $this->effectiveEndUtc < $this->endUtc;
    }

    public function isHourly(): bool
    {
        return $this->granularity === self::GRANULARITY_HOUR;
    }
}
