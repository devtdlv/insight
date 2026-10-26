<?php

namespace App\Support\Demo;

use Carbon\CarbonImmutable;
use Generator;

/**
 * Builds a fictional, coherent event history for local demos.
 *
 * Every visitor has a plan (first day, return days, whether and when they
 * sign up) and an event budget. Events are then produced session by session,
 * so a visitor's history reads as a story rather than random rows. Nothing
 * here touches the database or PHP's global random state: the same seed and
 * the same "now" always give the same rows.
 *
 * All identifiers are made-up random tokens. No real personal data is used.
 */
final class DemoAnalyticsGenerator
{
    public const EVENT_NAMES = [
        'page_view',
        'signup_started',
        'signup_completed',
        'login',
        'dashboard_viewed',
        'project_created',
        'report_viewed',
        'report_exported',
        'filter_applied',
        'invitation_sent',
        'settings_updated',
        'subscription_viewed',
    ];

    /** Relative chance of a session starting in each local hour. */
    private const HOUR_WEIGHTS = [
        0.2, 0.1, 0.1, 0.1, 0.1, 0.2, 0.5, 1.0, 2.5, 4.0, 5.0, 5.0,
        4.0, 5.0, 5.0, 4.5, 4.0, 3.0, 2.0, 1.8, 1.5, 1.2, 0.8, 0.4,
    ];

    /** Relative activity by ISO weekday (1 = Monday). */
    private const WEEKDAY_FACTORS = [1 => 0.95, 2 => 1.05, 3 => 1.05, 4 => 1.0, 5 => 0.9, 6 => 0.55, 7 => 0.45];

    private readonly CarbonImmutable $end;

    private readonly CarbonImmutable $start;

    private SeededRandom $random;

    /** @var list<array{start: CarbonImmutable, weight: float}> */
    private array $days = [];

    private int $eventCounter = 0;

    public function __construct(
        private readonly int $seed,
        CarbonImmutable $now,
        private readonly string $timezone,
        private readonly int $targetEvents = 12000,
        private readonly int $visitorCount = 1200,
        private readonly int $identifiedCount = 300,
        private readonly int $windowDays = 90,
    ) {
        $this->end = $now->utc()->startOfSecond();
        $this->start = $this->end->subDays($this->windowDays);
        $this->random = new SeededRandom($this->seed);
    }

    /**
     * Yields rows shaped for the analytics_events table, without project_id.
     * `properties` is an array or null and is not yet JSON encoded.
     *
     * @return Generator<int, array{name: string, anonymous_id: string, identified_user_id: string|null, properties: array<string, mixed>|null, occurred_at: string, received_at: string, client_event_id: string}>
     */
    public function events(): Generator
    {
        $this->random = new SeededRandom($this->seed);
        $this->eventCounter = 0;
        $this->days = $this->buildDays();

        foreach ($this->planVisitors() as $visitor) {
            yield from $this->visitorEvents($visitor);
        }
    }

    /**
     * @return list<array{start: CarbonImmutable, weight: float}>
     */
    private function buildDays(): array
    {
        $days = [];
        $cursor = $this->start->setTimezone($this->timezone)->startOfDay();
        $total = max(1, $this->windowDays);

        while ($cursor <= $this->end) {
            $next = $cursor->addDays(1)->startOfDay();
            $overlap = min($next->getTimestamp(), $this->end->getTimestamp())
                - max($cursor->getTimestamp(), $this->start->getTimestamp());
            $fraction = max(0, $overlap) / max(1, $next->getTimestamp() - $cursor->getTimestamp());

            $position = count($days) / $total;
            $growth = 1.0 + 1.4 * min(1.0, $position);
            $noise = 0.75 + 0.5 * $this->random->float();
            $weekday = self::WEEKDAY_FACTORS[$cursor->dayOfWeekIso];

            $days[] = ['start' => $cursor, 'weight' => $growth * $weekday * $noise * $fraction];
            $cursor = $next;
        }

        return $days;
    }

    /**
     * @return list<array{anonymous_id: string, user_id: string|null, identified: bool, abandons_signup: bool, sessions: list<array{day: int, budget: int}>, signup_session: int}>
     */
    private function planVisitors(): array
    {
        $visitors = [];
        $usedAnonymous = [];
        $usedUsers = [];
        $dayWeights = array_column($this->days, 'weight');
        $weights = [];

        for ($i = 0; $i < $this->visitorCount; $i++) {
            $identified = $i < $this->identifiedCount;

            do {
                $anonymousId = 'anon_'.$this->random->token(22);
            } while (isset($usedAnonymous[strtolower($anonymousId)]));
            $usedAnonymous[strtolower($anonymousId)] = true;

            $userId = null;

            if ($identified) {
                do {
                    $userId = 'usr_'.$this->random->token(14);
                } while (isset($usedUsers[strtolower($userId)]));
                $usedUsers[strtolower($userId)] = true;
            }

            $firstDay = (int) $this->random->weighted($dayWeights);
            $wanted = $identified
                ? 2 + (int) $this->random->weighted([0 => 3, 1 => 3, 2 => 3, 3 => 2, 4 => 2, 5 => 1, 6 => 1])
                : ($this->random->chance(0.62) ? 1 : 1 + $this->random->int(1, 3));

            $dayIndexes = [$firstDay];
            $candidates = [];

            for ($d = $firstDay + 1; $d < count($this->days); $d++) {
                $candidates[$d] = $dayWeights[$d];
            }

            while (count($dayIndexes) < $wanted && $candidates !== []) {
                $pick = (int) $this->random->weighted($candidates);
                $dayIndexes[] = $pick;
                unset($candidates[$pick]);
            }

            sort($dayIndexes);

            $signupSession = $identified && count($dayIndexes) >= 2 && $this->random->chance(0.35) ? 1 : 0;
            $abandons = ! $identified && $this->random->chance(0.12);

            $sessions = [];

            foreach ($dayIndexes as $index => $day) {
                $sessions[] = ['day' => $day, 'budget' => $this->minimumBudget($identified, $abandons, $index, $signupSession)];
            }

            $visitors[] = [
                'anonymous_id' => $anonymousId,
                'user_id' => $userId,
                'identified' => $identified,
                'abandons_signup' => $abandons,
                'sessions' => $sessions,
                'signup_session' => $signupSession,
            ];

            $weights[] = exp(0.6 * $this->random->normal()) * ($identified ? 3.0 : 1.0);
        }

        return $this->allocateBudgets($visitors, $weights);
    }

    private function minimumBudget(bool $identified, bool $abandons, int $sessionIndex, int $signupSession): int
    {
        if ($identified) {
            return $sessionIndex === $signupSession ? 4 : ($sessionIndex < $signupSession ? 1 : 2);
        }

        return $abandons && $sessionIndex === 0 ? 2 : 1;
    }

    /**
     * Shares the target event count across visitors, then across each
     * visitor's sessions. The total always matches the target.
     *
     * @param  list<array<string, mixed>>  $visitors
     * @param  list<float>  $weights
     * @return list<array<string, mixed>>
     */
    private function allocateBudgets(array $visitors, array $weights): array
    {
        $weightSum = array_sum($weights);
        $totals = [];
        $minimums = [];

        foreach ($visitors as $index => $visitor) {
            $minimums[$index] = array_sum(array_column($visitor['sessions'], 'budget'));
            $totals[$index] = max($minimums[$index], (int) round($weights[$index] / $weightSum * $this->targetEvents));
        }

        $difference = $this->targetEvents - array_sum($totals);
        $count = count($totals);
        $guard = 0;

        for ($i = 0; $difference !== 0 && $count > 0 && $guard < $this->targetEvents * 4; $i++, $guard++) {
            $index = $i % $count;

            if ($difference > 0) {
                $totals[$index]++;
                $difference--;
            } elseif ($totals[$index] > $minimums[$index]) {
                $totals[$index]--;
                $difference++;
            }
        }

        foreach ($visitors as $index => $visitor) {
            $extra = $totals[$index] - $minimums[$index];
            $sessionCount = count($visitor['sessions']);
            $shares = [];

            foreach (array_keys($visitor['sessions']) as $s) {
                $shares[$s] = 0.4 + $this->random->float();
            }

            $shareSum = array_sum($shares);
            $given = 0;

            foreach (array_keys($visitor['sessions']) as $s) {
                $add = $s === $sessionCount - 1 ? $extra - $given : (int) floor($extra * $shares[$s] / $shareSum);
                $visitors[$index]['sessions'][$s]['budget'] += $add;
                $given += $add;
            }
        }

        return $visitors;
    }

    /**
     * @param  array<string, mixed>  $visitor
     * @return Generator<int, array{name: string, anonymous_id: string, identified_user_id: string|null, properties: array<string, mixed>|null, occurred_at: string, received_at: string, client_event_id: string}>
     */
    private function visitorEvents(array $visitor): Generator
    {
        foreach ($visitor['sessions'] as $sessionIndex => $session) {
            $names = $this->sessionNames($visitor, $sessionIndex, $session['budget']);

            $gaps = [];
            $duration = 0;

            foreach ($names as $i => $name) {
                $gap = $i === 0 ? 0 : $this->random->int(4, 110);
                $gaps[] = $gap;
                $duration += $gap;
            }

            $cursor = $this->sessionStart($session['day'], $duration);
            $identifiedFrom = $this->identifiedFrom($visitor, $sessionIndex, $names);

            foreach ($names as $i => $name) {
                $cursor = $cursor->addSeconds($gaps[$i]);
                $received = $cursor->addSeconds($this->random->int(0, 4));

                if ($received > $this->end) {
                    $received = $this->end;
                }

                $this->eventCounter++;

                yield [
                    'name' => $name,
                    'anonymous_id' => $visitor['anonymous_id'],
                    'identified_user_id' => $identifiedFrom !== null && $i >= $identifiedFrom ? $visitor['user_id'] : null,
                    'properties' => $this->properties($name),
                    'occurred_at' => $cursor->format('Y-m-d H:i:s'),
                    'received_at' => $received->format('Y-m-d H:i:s'),
                    'client_event_id' => sprintf('demo_%06d', $this->eventCounter),
                ];
            }
        }
    }

    /**
     * Position in the session from which events carry the user id, or null
     * when the visitor is still anonymous during this session.
     *
     * @param  array<string, mixed>  $visitor
     * @param  list<string>  $names
     */
    private function identifiedFrom(array $visitor, int $sessionIndex, array $names): ?int
    {
        if (! $visitor['identified']) {
            return null;
        }

        if ($sessionIndex < $visitor['signup_session']) {
            return null;
        }

        if ($sessionIndex > $visitor['signup_session']) {
            return 0;
        }

        $position = array_search('signup_completed', $names, true);

        return $position === false ? null : $position;
    }

    /**
     * @param  array<string, mixed>  $visitor
     * @return list<string>
     */
    private function sessionNames(array $visitor, int $sessionIndex, int $length): array
    {
        if ($visitor['identified'] && $sessionIndex === $visitor['signup_session']) {
            $leading = 1 + ($length >= 8 ? $this->random->int(0, 2) : 0);
            $names = array_fill(0, $leading, 'page_view');
            $names[] = 'signup_started';
            $names[] = 'signup_completed';
            $names[] = 'dashboard_viewed';

            return $this->fillActivity($names, $length);
        }

        if ($visitor['identified'] && $sessionIndex > $visitor['signup_session']) {
            $names = [];

            if ($this->random->chance(0.85)) {
                $names[] = 'login';
            }

            if ($this->random->chance(0.8) || $names === []) {
                $names[] = 'dashboard_viewed';
            }

            return $this->fillActivity($names, $length);
        }

        $names = array_fill(0, max(1, $length), 'page_view');

        if ($visitor['abandons_signup'] && $sessionIndex === 0 && $length >= 2) {
            $names[$this->random->int(1, $length - 1)] = 'signup_started';
        }

        return array_slice($names, 0, $length);
    }

    /**
     * Extends a session with in-app activity, up to the requested length.
     *
     * @param  list<string>  $names
     * @return list<string>
     */
    private function fillActivity(array $names, int $length): array
    {
        $created = in_array('project_created', $names, true);

        while (count($names) < $length) {
            $previous = $names[count($names) - 1] ?? '';
            $afterReport = in_array($previous, ['report_viewed', 'filter_applied'], true);

            $weights = [
                'report_viewed' => 34,
                'filter_applied' => $afterReport ? 16 : 0,
                'report_exported' => $afterReport ? 7 : 0,
                'page_view' => 12,
                'dashboard_viewed' => 8,
                'settings_updated' => 5,
                'subscription_viewed' => 5,
                'invitation_sent' => 3,
                'project_created' => $created ? 0 : 5,
            ];

            $pick = (string) $this->random->weighted($weights);

            if ($pick === 'project_created') {
                $created = true;
            }

            $names[] = $pick;
        }

        return array_slice($names, 0, $length);
    }

    private function sessionStart(int $dayIndex, int $durationSeconds): CarbonImmutable
    {
        $hour = (int) $this->random->weighted(self::HOUR_WEIGHTS);
        $local = $this->days[$dayIndex]['start']->setTime($hour, $this->random->int(0, 59), $this->random->int(0, 59));
        $instant = $local->utc();

        $latest = $this->end->subSeconds($durationSeconds + $this->random->int(0, 300));

        if ($instant > $latest) {
            $instant = $latest;
        }

        if ($instant < $this->start) {
            $instant = $this->start->addSeconds($this->random->int(0, 3600));
        }

        return $instant;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function properties(string $name): ?array
    {
        $extra = match ($name) {
            'page_view' => [
                'path' => $this->random->pick(['/', '/pricing', '/features', '/docs', '/blog', '/changelog']),
                'referrer' => $this->random->pick(['direct', 'search', 'newsletter', 'social']),
            ],
            'signup_started' => ['source' => $this->random->pick(['homepage', 'pricing', 'docs'])],
            'signup_completed' => ['plan' => $this->random->pick(['free', 'free', 'team'])],
            'login' => ['method' => 'password'],
            'report_viewed' => ['report' => $this->random->pick(['weekly_summary', 'engagement', 'acquisition', 'activity'])],
            'report_exported' => ['format' => $this->random->pick(['csv', 'pdf'])],
            'filter_applied' => ['filter' => $this->random->pick(['date_range', 'segment', 'event_name'])],
            'invitation_sent' => ['role' => 'member'],
            'settings_updated' => ['section' => $this->random->pick(['profile', 'notifications', 'workspace'])],
            'subscription_viewed' => ['plan' => $this->random->pick(['free', 'team'])],
            default => [],
        };

        return ['demo_data' => true] + $extra;
    }
}
