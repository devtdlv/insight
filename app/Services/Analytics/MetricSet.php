<?php

namespace App\Services\Analytics;

/**
 * The four headline metrics for one window.
 *
 * Unique visitors count distinct anonymous identifiers, which are not
 * necessarily distinct people. Identified users are counted separately and are
 * not a subset or remainder of visitors.
 */
final readonly class MetricSet
{
    public function __construct(
        public int $totalEvents,
        public int $uniqueVisitors,
        public int $identifiedUsers,
    ) {}

    public static function empty(): self
    {
        return new self(0, 0, 0);
    }

    /** Total events divided by unique visitors, or null when there are no visitors. */
    public function eventsPerVisitor(): ?float
    {
        return $this->uniqueVisitors === 0 ? null : $this->totalEvents / $this->uniqueVisitors;
    }

    /**
     * @return array{totalEvents: int, uniqueVisitors: int, identifiedUsers: int, eventsPerVisitor: float|null}
     */
    public function toArray(): array
    {
        return [
            'totalEvents' => $this->totalEvents,
            'uniqueVisitors' => $this->uniqueVisitors,
            'identifiedUsers' => $this->identifiedUsers,
            'eventsPerVisitor' => $this->eventsPerVisitor(),
        ];
    }
}
