<?php

namespace App\Services\Analytics;

use App\Models\AnalyticsEvent;
use App\Models\Project;
use App\Support\Analytics\DateRange;
use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;

/**
 * Aggregates analytics events for one already-authorized project.
 *
 * Every query filters on the project's own key and the half-open window
 * `occurred_at >= start AND occurred_at < end` with UTC boundaries. The current
 * window ends at DateRange::effectiveEndUtc, so future-dated events are never
 * read. No SQL timezone conversion is used.
 *
 * Queries per call: at most 4 (current metrics, previous metrics, activity,
 * top events). A query is skipped when its window is empty.
 */
class ProjectAnalytics
{
    public const TOP_EVENTS_LIMIT = 10;

    public function summarize(Project $project, DateRange $range): ProjectAnalyticsResult
    {
        $currentStart = $range->startUtc;
        $currentEnd = $range->effectiveEndUtc;
        $previous = $range->elapsedComparison;

        $current = $this->metrics($project, $currentStart, $currentEnd);

        return new ProjectAnalyticsResult(
            range: $range,
            current: $current,
            previous: $this->metrics($project, $previous['start'], $previous['end']),
            activity: $this->activity($project, $range),
            topEvents: $this->topEvents($project, $currentStart, $currentEnd, $current->totalEvents),
        );
    }

    private function metrics(Project $project, CarbonInterface $start, CarbonInterface $end): MetricSet
    {
        if ($this->isEmpty($start, $end)) {
            return MetricSet::empty();
        }

        $query = $this->window($project, $start, $end);
        $visitor = $this->exact($query, 'anonymous_id');
        $user = $this->exact($query, 'identified_user_id');

        // COUNT(DISTINCT col) ignores NULLs, so identified users are non-null only.
        // Identifiers are compared case-sensitively: User_A and user_a differ.
        $row = $query
            ->selectRaw('COUNT(*) AS total_events')
            ->selectRaw("COUNT(DISTINCT {$visitor}) AS unique_visitors")
            ->selectRaw("COUNT(DISTINCT {$user}) AS identified_users")
            ->first();

        return new MetricSet(
            (int) $row->total_events,
            (int) $row->unique_visitors,
            (int) $row->identified_users,
        );
    }

    /**
     * One grouped query. Buckets are contiguous, so a CASE over the bucket end
     * instants assigns each event to exactly one bucket: the first bucket whose
     * end is after the event. The window's lower bound is the first bucket's
     * start and its upper bound the last bucket's end. Only non-empty buckets
     * come back, and zeros are filled in PHP, so the result is bounded by the
     * bucket count.
     *
     * @return list<array{key: string, start: CarbonInterface, end: CarbonInterface, label: string, localStart: string, partial: bool, count: int}>
     */
    private function activity(Project $project, DateRange $range): array
    {
        $buckets = $range->buckets;

        if ($buckets === []) {
            return [];
        }

        $cases = '';
        $bindings = [];

        foreach ($buckets as $index => $bucket) {
            $cases .= ' WHEN occurred_at < ? THEN '.(int) $index;
            $bindings[] = $this->format($bucket['end']);
        }

        $counts = $this->window($project, $range->startUtc, $range->effectiveEndUtc)
            ->selectRaw("CASE{$cases} END AS bucket_index, COUNT(*) AS event_count", $bindings)
            ->groupBy('bucket_index')
            ->pluck('event_count', 'bucket_index');

        return array_map(
            fn (array $bucket, int $index): array => $bucket + ['count' => (int) ($counts[$index] ?? 0)],
            $buckets,
            array_keys($buckets),
        );
    }

    /**
     * @return list<array{name: string, count: int, share: float}>
     */
    private function topEvents(Project $project, CarbonInterface $start, CarbonInterface $end, int $total): array
    {
        if ($total === 0) {
            return [];
        }

        $query = $this->window($project, $start, $end);

        // Names are grouped and ordered case-sensitively: note_created and
        // Note_Created are different events.
        return $query
            ->selectRaw($this->exact($query, 'name').' AS event_name')
            ->selectRaw('COUNT(*) AS event_count')
            ->groupBy('event_name')
            ->orderByDesc('event_count')
            ->orderBy('event_name')
            ->limit(self::TOP_EVENTS_LIMIT)
            ->get()
            ->map(fn (object $row): array => [
                'name' => (string) $row->event_name,
                'count' => (int) $row->event_count,
                'share' => (int) $row->event_count / $total,
            ])
            ->all();
    }

    /** Project-scoped, half-open [start, end) on occurred_at. */
    private function window(Project $project, CarbonInterface $start, CarbonInterface $end): Builder
    {
        return AnalyticsEvent::query()
            ->toBase()
            ->where('project_id', $project->getKey())
            ->where('occurred_at', '>=', $this->format($start))
            ->where('occurred_at', '<', $this->format($end));
    }

    /**
     * A case-sensitive form of a string column for grouping, DISTINCT and ordering.
     *
     * The columns use the connection collation (utf8mb4_unicode_ci by default),
     * which MariaDB compares case-insensitively. CAST(... AS BINARY) compares
     * bytes, which is exact and independent of the column's character set. It
     * cannot be verified on SQLite, whose default comparison is already exact
     * and where CAST AS BINARY would apply numeric affinity, so SQLite gets the
     * bare column. $column is always a literal from this class.
     */
    private function exact(Builder $query, string $column): string
    {
        return in_array($query->getConnection()->getDriverName(), ['mysql', 'mariadb'], true)
            ? "CAST({$column} AS BINARY)"
            : $column;
    }

    private function isEmpty(CarbonInterface $start, CarbonInterface $end): bool
    {
        return $start >= $end;
    }

    private function format(CarbonInterface $instant): string
    {
        return $instant->copy()->utc()->format('Y-m-d H:i:s');
    }
}
