<?php

use App\Models\AnalyticsEvent;
use App\Models\Project;
use App\Models\Workspace;
use App\Services\Analytics\ProjectAnalytics;
use App\Services\Analytics\ProjectAnalyticsResult;
use App\Support\Analytics\DateRange;
use App\Support\Analytics\DateRangeResolver;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

const ANALYTICS_NOW = '2026-10-14 12:00:00';

function analyticsProject(string $timezone = 'UTC', ?Workspace $workspace = null): Project
{
    return Project::factory()->create([
        'workspace_id' => ($workspace ?? Workspace::factory()->create())->id,
        'timezone' => $timezone,
    ]);
}

function seedAnalyticsEvent(
    Project $project,
    string $occurredAt,
    string $name = 'page_viewed',
    string $anonymousId = 'anon_a',
    ?string $identifiedUserId = null,
    ?string $receivedAt = null,
): void {
    AnalyticsEvent::query()->insert([
        'project_id' => $project->id,
        'name' => $name,
        'anonymous_id' => $anonymousId,
        'identified_user_id' => $identifiedUserId,
        'properties' => null,
        'occurred_at' => $occurredAt,
        'received_at' => $receivedAt ?? $occurredAt,
        'client_event_id' => null,
    ]);
}

function analyticsRange(string $timezone, string $preset, ?string $from = null, ?string $to = null, string $now = ANALYTICS_NOW): DateRange
{
    return (new DateRangeResolver)->resolve($timezone, $preset, $from, $to, CarbonImmutable::parse($now, 'UTC'));
}

function summarize(Project $project, DateRange $range): ProjectAnalyticsResult
{
    return app(ProjectAnalytics::class)->summarize($project, $range);
}

/** @return list<int> */
function bucketCounts(ProjectAnalyticsResult $result): array
{
    return array_column($result->activity, 'count');
}

it('calculates total events, distinct visitors, identified users and events per visitor', function () {
    $project = analyticsProject();

    seedAnalyticsEvent($project, '2026-10-10 10:00:00', 'page_viewed', 'anon_a', 'user_1');
    seedAnalyticsEvent($project, '2026-10-10 11:00:00', 'page_viewed', 'anon_a', 'user_1');
    seedAnalyticsEvent($project, '2026-10-11 09:00:00', 'signup', 'anon_b');
    seedAnalyticsEvent($project, '2026-10-12 09:00:00', 'page_viewed', 'anon_c', 'user_2');
    seedAnalyticsEvent($project, '2026-10-13 09:00:00', 'signup', 'anon_a', 'user_2');

    $current = summarize($project, analyticsRange('UTC', '7d'))->current;

    expect($current->totalEvents)->toBe(5);
    expect($current->uniqueVisitors)->toBe(3);
    // Identified users are counted on their own, never subtracted from visitors.
    expect($current->identifiedUsers)->toBe(2);
    expect($current->eventsPerVisitor())->toEqualWithDelta(5 / 3, 1e-12);
});

it('calculates the previous period over the elapsed comparison window', function () {
    $project = analyticsProject();

    // Current 7d window is [Oct 8 00:00, Oct 14 12:00). Previous is [Oct 1 00:00, Oct 7 12:00).
    seedAnalyticsEvent($project, '2026-10-09 10:00:00', 'page_viewed', 'anon_a');
    seedAnalyticsEvent($project, '2026-10-02 10:00:00', 'page_viewed', 'anon_x');
    seedAnalyticsEvent($project, '2026-10-03 10:00:00', 'page_viewed', 'anon_x', 'user_9');
    seedAnalyticsEvent($project, '2026-10-07 11:59:59', 'page_viewed', 'anon_y');
    seedAnalyticsEvent($project, '2026-10-07 12:00:00', 'page_viewed', 'anon_z'); // exclusive end
    seedAnalyticsEvent($project, '2026-10-07 20:00:00', 'page_viewed', 'anon_w'); // in the gap
    seedAnalyticsEvent($project, '2026-09-30 23:59:59', 'page_viewed', 'anon_v'); // before the window

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect($result->current->totalEvents)->toBe(1);
    expect($result->previous->totalEvents)->toBe(3);
    expect($result->previous->uniqueVisitors)->toBe(2);
    expect($result->previous->identifiedUsers)->toBe(1);
    expect($result->previous->eventsPerVisitor())->toBe(1.5);
});

it('compares by local wall-clock time across a DST change', function () {
    $project = analyticsProject('America/Los_Angeles');

    // Now is Monday 10:00 PDT. The previous window ends Monday Mar 2 at 10:00 PST (18:00Z).
    seedAnalyticsEvent($project, '2026-03-02 17:30:00'); // 09:30 local, included
    seedAnalyticsEvent($project, '2026-03-02 18:00:00'); // 10:00 local, exclusive
    seedAnalyticsEvent($project, '2026-03-02 18:30:00'); // 10:30 local, excluded

    $result = summarize($project, analyticsRange('America/Los_Angeles', '7d', now: '2026-03-09 17:00:00'));

    expect($result->previous->totalEvents)->toBe(1);
});

it('applies inclusive start and exclusive end boundaries to the current window', function () {
    $project = analyticsProject();

    seedAnalyticsEvent($project, '2026-10-07 23:59:59', anonymousId: 'anon_before');
    seedAnalyticsEvent($project, '2026-10-08 00:00:00', anonymousId: 'anon_start'); // inclusive
    seedAnalyticsEvent($project, '2026-10-14 11:59:59', anonymousId: 'anon_last');
    seedAnalyticsEvent($project, '2026-10-14 12:00:00', anonymousId: 'anon_now'); // exclusive

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect($result->current->totalEvents)->toBe(2);
    expect($result->current->uniqueVisitors)->toBe(2);
    expect(array_sum(bucketCounts($result)))->toBe(2);
});

it('never counts future-dated events', function () {
    $project = analyticsProject();

    seedAnalyticsEvent($project, '2026-10-14 11:00:00', 'page_viewed', 'anon_a');
    seedAnalyticsEvent($project, '2026-10-14 12:00:01', 'future_one', 'anon_b');
    seedAnalyticsEvent($project, '2026-10-15 03:00:00', 'future_two', 'anon_c', 'user_f');

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect($result->current->totalEvents)->toBe(1);
    expect($result->current->uniqueVisitors)->toBe(1);
    expect($result->current->identifiedUsers)->toBe(0);
    expect(array_sum(bucketCounts($result)))->toBe(1);
    expect(array_column($result->topEvents, 'name'))->toBe(['page_viewed']);
});

it('counts events by occurred_at, not received_at', function () {
    $project = analyticsProject();

    // Backdated: received now, occurred in range.
    seedAnalyticsEvent($project, '2026-10-09 08:00:00', receivedAt: '2026-10-14 11:00:00');
    // Received in range, occurred before it.
    seedAnalyticsEvent($project, '2026-09-01 08:00:00', receivedAt: '2026-10-13 11:00:00');

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect($result->current->totalEvents)->toBe(1);
    expect(bucketCounts($result))->toBe([0, 1, 0, 0, 0, 0, 0]);
});

it('isolates analytics between projects and workspaces', function () {
    $workspace = Workspace::factory()->create();
    $project = analyticsProject('UTC', $workspace);
    $sibling = analyticsProject('UTC', $workspace);
    $foreign = analyticsProject();

    seedAnalyticsEvent($project, '2026-10-10 10:00:00', 'own_event', 'anon_shared', 'user_shared');
    foreach ([$sibling, $foreign] as $other) {
        seedAnalyticsEvent($other, '2026-10-10 10:00:00', 'other_event', 'anon_shared', 'user_shared');
        seedAnalyticsEvent($other, '2026-10-10 11:00:00', 'other_event', 'anon_other', 'user_other');
        seedAnalyticsEvent($other, '2026-10-03 11:00:00', 'other_event', 'anon_other');
    }

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect($result->current->totalEvents)->toBe(1);
    expect($result->current->uniqueVisitors)->toBe(1);
    expect($result->current->identifiedUsers)->toBe(1);
    expect($result->previous->totalEvents)->toBe(0);
    expect(array_sum(bucketCounts($result)))->toBe(1);
    expect(array_column($result->topEvents, 'name'))->toBe(['own_event']);
});

it('handles an empty dataset', function () {
    $result = summarize(analyticsProject(), analyticsRange('UTC', '7d'));

    foreach ([$result->current, $result->previous] as $metrics) {
        expect($metrics->totalEvents)->toBe(0);
        expect($metrics->uniqueVisitors)->toBe(0);
        expect($metrics->identifiedUsers)->toBe(0);
        expect($metrics->eventsPerVisitor())->toBeNull();
    }

    expect(bucketCounts($result))->toBe([0, 0, 0, 0, 0, 0, 0]);
    expect($result->topEvents)->toBe([]);
});

it('returns a null events per visitor when only the comparison window is empty', function () {
    $project = analyticsProject();
    seedAnalyticsEvent($project, '2026-10-10 10:00:00');

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect($result->current->eventsPerVisitor())->toBe(1.0);
    expect($result->previous->eventsPerVisitor())->toBeNull();
});

it('handles zero-length windows without querying', function () {
    $project = analyticsProject('Asia/Manila');
    // Now is exactly local midnight, the start of the selected date.
    seedAnalyticsEvent($project, '2026-10-13 16:00:00'); // exactly now: exclusive
    seedAnalyticsEvent($project, '2026-10-12 20:00:00');

    $range = analyticsRange('Asia/Manila', 'custom', '2026-10-14', '2026-10-14', '2026-10-13 16:00:00');

    DB::flushQueryLog();
    DB::enableQueryLog();
    $result = summarize($project, $range);

    expect(DB::getQueryLog())->toBe([]);
    expect($result->current->totalEvents)->toBe(0);
    expect($result->previous->totalEvents)->toBe(0);
    expect($result->activity)->toBe([]);
    expect($result->topEvents)->toBe([]);
    expect($result->current->eventsPerVisitor())->toBeNull();
});

it('zero-fills buckets and keeps them ordered', function () {
    $project = analyticsProject();
    seedAnalyticsEvent($project, '2026-10-09 10:00:00');
    seedAnalyticsEvent($project, '2026-10-09 23:59:59');
    seedAnalyticsEvent($project, '2026-10-12 00:00:00');

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect(bucketCounts($result))->toBe([0, 2, 0, 0, 1, 0, 0]);
    expect(array_column($result->activity, 'key'))->toBe([
        '2026-10-08T00:00:00Z', '2026-10-09T00:00:00Z', '2026-10-10T00:00:00Z', '2026-10-11T00:00:00Z',
        '2026-10-12T00:00:00Z', '2026-10-13T00:00:00Z', '2026-10-14T00:00:00Z',
    ]);
    expect(array_sum(bucketCounts($result)))->toBe($result->current->totalEvents);
});

it('assigns every event to exactly one bucket at DST and offset boundaries', function (string $timezone, string $date, int $expectedBuckets) {
    $project = analyticsProject($timezone);
    $range = analyticsRange($timezone, 'custom', $date, $date, '2026-11-20 12:00:00');

    expect($range->buckets)->toHaveCount($expectedBuckets);

    // One event on each bucket's first second and one on its last second.
    foreach ($range->buckets as $bucket) {
        seedAnalyticsEvent($project, $bucket['start']->format('Y-m-d H:i:s'));
        seedAnalyticsEvent($project, $bucket['end']->subSecond()->format('Y-m-d H:i:s'));
    }

    // Just outside the window: one second before the start and exactly at the end.
    seedAnalyticsEvent($project, $range->startUtc->subSecond()->format('Y-m-d H:i:s'));
    seedAnalyticsEvent($project, $range->endUtc->format('Y-m-d H:i:s'));

    $result = summarize($project, $range);

    expect($result->current->totalEvents)->toBe($expectedBuckets * 2);
    expect(bucketCounts($result))->toBe(array_fill(0, $expectedBuckets, 2));
})->with([
    'Manila' => ['Asia/Manila', '2026-10-10', 24],
    'Los Angeles spring forward' => ['America/Los_Angeles', '2026-03-08', 23],
    'Los Angeles fall back' => ['America/Los_Angeles', '2026-11-01', 25],
    'Kathmandu +05:45' => ['Asia/Kathmandu', '2026-10-10', 24],
    'Lord Howe spring forward' => ['Australia/Lord_Howe', '2026-10-04', 23],
    'Lord Howe fall back' => ['Australia/Lord_Howe', '2026-04-05', 24],
]);

it('separates a repeated local hour into two buckets', function () {
    $project = analyticsProject('America/Los_Angeles');

    seedAnalyticsEvent($project, '2026-11-01 08:30:00'); // 01:30 PDT
    seedAnalyticsEvent($project, '2026-11-01 09:30:00'); // 01:30 PST
    seedAnalyticsEvent($project, '2026-11-01 09:45:00'); // 01:45 PST

    $result = summarize($project, analyticsRange('America/Los_Angeles', 'custom', '2026-11-01', '2026-11-01', '2026-11-20 12:00:00'));

    $byKey = array_column($result->activity, 'count', 'key');
    expect($byKey['2026-11-01T08:00:00Z'])->toBe(1);
    expect($byKey['2026-11-01T09:00:00Z'])->toBe(2);
});

it('stops the activity series at the effective end', function () {
    $project = analyticsProject('Asia/Manila');
    seedAnalyticsEvent($project, '2026-10-14 07:59:59');
    seedAnalyticsEvent($project, '2026-10-14 08:00:00'); // inside the clipped last bucket
    seedAnalyticsEvent($project, '2026-10-14 08:30:00'); // exactly now, excluded

    $range = analyticsRange('Asia/Manila', 'custom', '2026-10-14', '2026-10-14', '2026-10-14 08:30:00');
    $result = summarize($project, $range);

    expect($result->activity)->toHaveCount(17); // local hours 00:00 to 16:00
    expect(array_sum(bucketCounts($result)))->toBe(2);
    expect($result->activity[16]['count'])->toBe(1);
    expect($result->activity[15]['count'])->toBe(1);
});

it('returns the top ten events ordered by count then name with shares', function () {
    $project = analyticsProject();

    $plan = ['page_viewed' => 5, 'signup' => 3, 'a_click' => 3, 'b_click' => 3];
    for ($i = 1; $i <= 12; $i++) {
        $plan[sprintf('rare_%02d', $i)] = 1;
    }

    $minute = 0;
    foreach ($plan as $name => $count) {
        for ($n = 0; $n < $count; $n++) {
            seedAnalyticsEvent($project, CarbonImmutable::parse('2026-10-12 00:00:00', 'UTC')->addMinutes($minute++)->format('Y-m-d H:i:s'), $name);
        }
    }

    $result = summarize($project, analyticsRange('UTC', '7d'));
    $total = array_sum($plan);

    expect($result->current->totalEvents)->toBe($total);
    expect($result->topEvents)->toHaveCount(10);
    expect(array_column($result->topEvents, 'name'))->toBe([
        'page_viewed', 'a_click', 'b_click', 'signup',
        'rare_01', 'rare_02', 'rare_03', 'rare_04', 'rare_05', 'rare_06',
    ]);
    expect($result->topEvents[0])->toEqual(['name' => 'page_viewed', 'count' => 5, 'share' => 5 / $total]);
    expect($result->topEvents[4]['share'])->toEqualWithDelta(1 / $total, 1e-12);
});

it('exposes a frontend-ready response without raw identifiers', function () {
    $project = analyticsProject('Asia/Manila');
    seedAnalyticsEvent($project, '2026-10-12 10:00:00', 'page_viewed', 'anon_secret_visitor', 'user_secret_person');

    $payload = summarize($project, analyticsRange('Asia/Manila', '7d'))->toArray();

    expect(array_keys($payload))->toBe(['range', 'currentPeriod', 'comparisonPeriod', 'current', 'previous', 'activity', 'topEvents']);
    expect($payload['range'])->toBe([
        'preset' => '7d',
        'timezone' => 'Asia/Manila',
        'localFrom' => '2026-10-08',
        'localTo' => '2026-10-14',
        'granularity' => 'day',
        'inProgress' => true,
    ]);
    expect($payload['currentPeriod'])->toBe(['start' => '2026-10-07T16:00:00Z', 'end' => '2026-10-14T12:00:00Z']);
    expect($payload['comparisonPeriod'])->toBe(['start' => '2026-09-30T16:00:00Z', 'end' => '2026-10-07T12:00:00Z']);
    expect(array_keys($payload['current']))->toBe(['totalEvents', 'uniqueVisitors', 'identifiedUsers', 'eventsPerVisitor']);
    expect($payload['previous']['eventsPerVisitor'])->toBeNull();
    expect(array_keys($payload['activity'][0]))->toBe(['key', 'start', 'end', 'label', 'localStart', 'partial', 'count']);

    $json = json_encode($payload);
    expect($json)->not->toContain('anon_secret_visitor');
    expect($json)->not->toContain('user_secret_person');
    expect($json)->not->toContain('write_key');
});

it('uses a fixed number of queries for a 90-day range', function () {
    $project = analyticsProject();
    seedAnalyticsEvent($project, '2026-08-01 10:00:00');
    seedAnalyticsEvent($project, '2026-06-01 10:00:00');

    DB::flushQueryLog();
    DB::enableQueryLog();
    $result = summarize($project, analyticsRange('UTC', '90d'));

    expect($result->activity)->toHaveCount(90);
    // Current metrics, previous metrics, activity, top events.
    expect(DB::getQueryLog())->toHaveCount(4);
    expect(array_sum(bucketCounts($result)))->toBe(1);
    expect($result->previous->totalEvents)->toBe(1);
});

it('stores ingested timestamps in UTC whatever offset the client sends', function (string $sent) {
    $this->travelTo('2026-10-14 12:00:00');
    $project = analyticsProject();

    $this->postJson('/api/v1/events', [
        'write_key' => $project->write_key,
        'name' => 'page_viewed',
        'anonymous_id' => 'anon_offsetcase1',
        'occurred_at' => $sent,
    ])->assertOk()->assertJson(['status' => 'accepted']);

    // All four inputs are the same instant: 2026-10-14 11:00:00 UTC.
    expect(DB::table('analytics_events')->value('occurred_at'))->toBe('2026-10-14 11:00:00');

    $result = summarize($project, analyticsRange('UTC', '24h'));
    expect($result->current->totalEvents)->toBe(1);
})->with([
    'zulu' => ['2026-10-14T11:00:00Z'],
    'positive offset' => ['2026-10-14T19:00:00+08:00'],
    'negative offset' => ['2026-10-14T04:00:00-07:00'],
    'quarter-hour offset' => ['2026-10-14T16:45:00+05:45'],
]);

it('treats differently cased event names as distinct events', function () {
    $project = analyticsProject();

    foreach (['note_created', 'note_created', 'Note_Created', 'NOTE_CREATED', 'note_Created'] as $i => $name) {
        seedAnalyticsEvent($project, '2026-10-12 10:0'.$i.':00', $name);
    }

    $result = summarize($project, analyticsRange('UTC', '7d'));

    expect($result->topEvents)->toHaveCount(4);
    expect(array_column($result->topEvents, 'count', 'name'))->toBe([
        'note_created' => 2,
        'NOTE_CREATED' => 1,
        'Note_Created' => 1,
        'note_Created' => 1,
    ]);
    // Count ties are broken by exact name order (uppercase sorts before lowercase).
    expect(array_column($result->topEvents, 'name'))->toBe(['note_created', 'NOTE_CREATED', 'Note_Created', 'note_Created']);
    expect($result->current->totalEvents)->toBe(5);
});

it('treats differently cased identifiers as distinct visitors and users', function () {
    $project = analyticsProject();

    seedAnalyticsEvent($project, '2026-10-12 10:00:00', anonymousId: 'anon_AbCdEf01', identifiedUserId: 'User_A');
    seedAnalyticsEvent($project, '2026-10-12 10:01:00', anonymousId: 'anon_abcdef01', identifiedUserId: 'user_a');
    seedAnalyticsEvent($project, '2026-10-12 10:02:00', anonymousId: 'anon_ABCDEF01', identifiedUserId: 'USER_A');
    seedAnalyticsEvent($project, '2026-10-12 10:03:00', anonymousId: 'anon_abcdef01', identifiedUserId: 'user_a');

    $current = summarize($project, analyticsRange('UTC', '7d'))->current;

    expect($current->totalEvents)->toBe(4);
    expect($current->uniqueVisitors)->toBe(3);
    expect($current->identifiedUsers)->toBe(3);
});

it('builds the activity query with sequential bucket indexes and only bound timestamps', function (string $preset, int $buckets) {
    $project = analyticsProject();
    seedAnalyticsEvent($project, '2026-10-12 10:00:00');

    DB::flushQueryLog();
    DB::enableQueryLog();
    summarize($project, analyticsRange('UTC', $preset));
    $queries = collect(DB::getQueryLog())->filter(fn ($q) => str_contains($q['query'], 'bucket_index'));

    expect($queries)->toHaveCount(1);
    $query = $queries->first();

    preg_match_all('/WHEN .*? THEN (\d+)/', $query['query'], $matches);
    expect(array_map('intval', $matches[1]))->toBe(range(0, $buckets - 1));
    expect(substr_count($query['query'], '?'))->toBe(count($query['bindings']));
    expect(count($query['bindings']))->toBe($buckets + 3); // bucket ends, project id, window start and end
    expect($query['query'])->not->toMatch('/\d{4}-\d{2}-\d{2}/');
})->with([
    '7 daily buckets' => ['7d', 7],
    '90 daily buckets' => ['90d', 90],
    '24 hourly buckets' => ['24h', 24],
]);
