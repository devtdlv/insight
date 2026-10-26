<?php

namespace App\Services\Analytics;

use App\Support\Analytics\DateRange;
use Carbon\CarbonInterface;

/**
 * Analytics for one project and one date range, ready for an Inertia prop.
 *
 * Contains aggregates only: no anonymous IDs, identified user IDs, event
 * properties or write keys.
 */
final readonly class ProjectAnalyticsResult
{
    /**
     * @param  list<array{key: string, start: CarbonInterface, end: CarbonInterface, label: string, localStart: string, partial: bool, count: int}>  $activity
     * @param  list<array{name: string, count: int, share: float}>  $topEvents
     */
    public function __construct(
        public DateRange $range,
        public MetricSet $current,
        public MetricSet $previous,
        public array $activity,
        public array $topEvents,
    ) {}

    /**
     * Shape (camelCase, ISO-8601 UTC strings):
     * - range: preset, timezone, localFrom, localTo, granularity, inProgress
     * - currentPeriod / comparisonPeriod: start, end (half-open, UTC)
     * - current / previous: totalEvents, uniqueVisitors, identifiedUsers, eventsPerVisitor
     * - activity: ordered buckets with key, start, end, label, localStart, partial, count
     * - topEvents: name, count, share (0 to 1)
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        $iso = fn (CarbonInterface $instant): string => $instant->format('Y-m-d\TH:i:s\Z');

        return [
            'range' => [
                'preset' => $this->range->preset,
                'timezone' => $this->range->timezone,
                'localFrom' => $this->range->localFrom,
                'localTo' => $this->range->localTo,
                'granularity' => $this->range->granularity,
                'inProgress' => $this->range->inProgress(),
            ],
            'currentPeriod' => [
                'start' => $iso($this->range->startUtc),
                'end' => $iso($this->range->effectiveEndUtc),
            ],
            'comparisonPeriod' => [
                'start' => $iso($this->range->elapsedComparison['start']),
                'end' => $iso($this->range->elapsedComparison['end']),
            ],
            'current' => $this->current->toArray(),
            'previous' => $this->previous->toArray(),
            'activity' => array_map(fn (array $bucket): array => [
                'key' => $bucket['key'],
                'start' => $iso($bucket['start']),
                'end' => $iso($bucket['end']),
                'label' => $bucket['label'],
                'localStart' => $bucket['localStart'],
                'partial' => $bucket['partial'],
                'count' => $bucket['count'],
            ], $this->activity),
            'topEvents' => $this->topEvents,
        ];
    }
}
