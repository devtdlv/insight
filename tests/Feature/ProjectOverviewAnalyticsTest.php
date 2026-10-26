<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\AnalyticsEvent;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Manila local time is 20:00 on 2026-10-14.
    $this->travelTo('2026-10-14 12:00:00');
});

/** @return array{Workspace, Project, User} */
function overviewSetup(string $timezone = 'Asia/Manila', string $role = 'member'): array
{
    $workspace = Workspace::factory()->create();
    $user = joinWorkspace($workspace, $role);
    $project = Project::factory()->create(['workspace_id' => $workspace->id, 'timezone' => $timezone]);

    return [$workspace, $project, $user];
}

function overviewSeed(Project $project, string $occurredAt, string $name = 'page_viewed', string $anonymousId = 'anon_a', ?string $userId = null): void
{
    AnalyticsEvent::query()->insert([
        'project_id' => $project->id,
        'name' => $name,
        'anonymous_id' => $anonymousId,
        'identified_user_id' => $userId,
        'properties' => json_encode(['secret_note' => 'private body']),
        'occurred_at' => $occurredAt,
        'received_at' => $occurredAt,
        'client_event_id' => null,
    ]);
}

/** @return array<string, string> */
function overviewPartialHeaders(string $only): array
{
    return [
        'X-Inertia' => 'true',
        'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
        'X-Inertia-Partial-Component' => 'Projects/Show',
        'X-Inertia-Partial-Data' => $only,
    ];
}

/** @return array<string, mixed> */
function overviewProps(TestResponse $response): array
{
    $props = [];
    $response->assertInertia(function (AssertableInertia $page) use (&$props) {
        $props = $page->toArray()['props'];
    });

    return $props;
}

it('defaults to the 7d range in the project timezone', function () {
    [$workspace, $project, $user] = overviewSetup('Asia/Manila');

    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Projects/Show')
            ->where('project.name', $project->name)
            ->where('analytics.range.preset', '7d')
            ->where('analytics.range.timezone', 'Asia/Manila')
            ->where('analytics.range.localFrom', '2026-10-08')
            ->where('analytics.range.localTo', '2026-10-14')
            ->where('analytics.currentPeriod.start', '2026-10-07T16:00:00Z')
            ->where('analytics.currentPeriod.end', '2026-10-14T12:00:00Z')
            ->has('analytics.activity', 7));
});

it('supports every preset', function (string $range, string $granularity, int $buckets) {
    [$workspace, $project, $user] = overviewSetup();

    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project, 'range' => $range]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('analytics.range.preset', $range)
            ->where('analytics.range.granularity', $granularity)
            ->has('analytics.activity', $buckets));
})->with([
    '24h' => ['24h', 'hour', 24], // now is on a local hour boundary, so no partial buckets
    '7d' => ['7d', 'day', 7],
    '30d' => ['30d', 'day', 30],
    '90d' => ['90d', 'day', 90],
]);

it('accepts a valid custom range of local dates', function () {
    [$workspace, $project, $user] = overviewSetup();

    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project, 'range' => 'custom', 'from' => '2026-10-01', 'to' => '2026-10-03']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('analytics.range.preset', 'custom')
            ->where('analytics.range.localFrom', '2026-10-01')
            ->where('analytics.range.localTo', '2026-10-03')
            ->where('analytics.currentPeriod.start', '2026-09-30T16:00:00Z')
            ->where('analytics.currentPeriod.end', '2026-10-03T16:00:00Z')
            ->has('analytics.activity', 3));
});

it('accepts a custom range of exactly 90 dates', function () {
    [$workspace, $project, $user] = overviewSetup();

    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project, 'range' => 'custom', 'from' => '2026-07-17', 'to' => '2026-10-14']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('analytics.activity', 90));
});

it('rejects invalid analytics query parameters with standard validation errors', function (array $query, array $errorFields) {
    [$workspace, $project, $user] = overviewSetup();

    $this->actingAs($user)
        ->from(route('projects.show', [$workspace, $project]))
        ->get(route('projects.show', [$workspace, $project] + $query))
        ->assertRedirect(route('projects.show', [$workspace, $project]))
        ->assertSessionHasErrors($errorFields);
})->with([
    'invalid preset' => [['range' => '14d'], ['range']],
    'wrong case preset' => [['range' => 'CUSTOM', 'from' => '2026-10-01', 'to' => '2026-10-02'], ['range']],
    'array range' => [['range' => ['7d']], ['range']],
    'custom without dates' => [['range' => 'custom'], ['from', 'to']],
    'custom missing end' => [['range' => 'custom', 'from' => '2026-10-01'], ['to']],
    'custom missing start' => [['range' => 'custom', 'to' => '2026-10-01'], ['from']],
    'bad date format' => [['range' => 'custom', 'from' => '10/01/2026', 'to' => '2026-10-02'], ['from']],
    'impossible date' => [['range' => 'custom', 'from' => '2026-02-30', 'to' => '2026-10-02'], ['from']],
    'reversed dates' => [['range' => 'custom', 'from' => '2026-10-05', 'to' => '2026-10-01'], ['to']],
    'future end date' => [['range' => 'custom', 'from' => '2026-10-10', 'to' => '2026-10-15'], ['to']],
    'future start date' => [['range' => 'custom', 'from' => '2026-10-15', 'to' => '2026-10-16'], ['from', 'to']],
    'over 90 days' => [['range' => 'custom', 'from' => '2026-07-16', 'to' => '2026-10-14'], ['to']],
    'dates with a preset' => [['range' => '7d', 'from' => '2026-10-01', 'to' => '2026-10-02'], ['from', 'to']],
    'dates without a range' => [['from' => '2026-10-01', 'to' => '2026-10-02'], ['from', 'to']],
    'tenant project_id' => [['project_id' => '999'], ['project_id']],
    'tenant workspace_id' => [['workspace_id' => '999'], ['workspace_id']],
    'tenant timezone' => [['timezone' => 'UTC'], ['timezone']],
]);

it('judges future dates in the project timezone', function () {
    // Now is 2026-10-14 12:00 UTC. It is already Oct 14 20:00 in Manila but Oct 14 05:00 in Los Angeles.
    [$workspace, $manila, $user] = overviewSetup('Asia/Manila');
    $la = Project::factory()->create(['workspace_id' => $workspace->id, 'timezone' => 'America/Los_Angeles']);

    $query = ['range' => 'custom', 'from' => '2026-10-14', 'to' => '2026-10-14'];
    $this->actingAs($user)->get(route('projects.show', [$workspace, $manila] + $query))->assertOk();
    $this->actingAs($user)->get(route('projects.show', [$workspace, $la] + $query))->assertOk();

    $this->travelTo('2026-10-14 23:00:00'); // Oct 15 07:00 in Manila, Oct 14 16:00 in Los Angeles
    $tomorrow = ['range' => 'custom', 'from' => '2026-10-15', 'to' => '2026-10-15'];
    $this->actingAs($user)->get(route('projects.show', [$workspace, $manila] + $tomorrow))->assertOk();
    $this->actingAs($user)->get(route('projects.show', [$workspace, $la] + $tomorrow))->assertSessionHasErrors(['from', 'to']);
});

it('returns correct aggregates through the route', function () {
    [$workspace, $project, $user] = overviewSetup('UTC');

    overviewSeed($project, '2026-10-10 10:00:00', 'page_viewed', 'anon_a', 'user_1');
    overviewSeed($project, '2026-10-10 11:00:00', 'page_viewed', 'anon_a', 'user_1');
    overviewSeed($project, '2026-10-11 09:00:00', 'signup', 'anon_b');
    overviewSeed($project, '2026-10-12 09:00:00', 'page_viewed', 'anon_c', 'user_2');
    overviewSeed($project, '2026-10-14 13:00:00', 'future_event', 'anon_f'); // after now
    overviewSeed($project, '2026-10-03 10:00:00', 'page_viewed', 'anon_old'); // previous window

    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project]))
        ->assertInertia(fn ($page) => $page
            ->where('analytics.current.totalEvents', 4)
            ->where('analytics.current.uniqueVisitors', 3)
            ->where('analytics.current.identifiedUsers', 2)
            ->where('analytics.current.eventsPerVisitor', fn ($value) => abs($value - 4 / 3) < 1e-9)
            ->where('analytics.previous.totalEvents', 1)
            ->where('analytics.topEvents.0.name', 'page_viewed')
            ->where('analytics.topEvents.0.count', 3)
            ->where('analytics.topEvents.1.name', 'signup')
            ->where('analytics.activity.2.count', 2)
            ->where('analytics.activity.3.count', 1)
            ->where('analytics.activity.4.count', 1));
});

it('exposes the documented analytics structure', function () {
    [$workspace, $project, $user] = overviewSetup();

    $props = overviewProps($this->actingAs($user)->get(route('projects.show', [$workspace, $project])));

    expect(array_keys($props['analytics']))->toBe(['range', 'currentPeriod', 'comparisonPeriod', 'current', 'previous', 'activity', 'topEvents']);
    expect(array_keys($props['analytics']['current']))->toBe(['totalEvents', 'uniqueVisitors', 'identifiedUsers', 'eventsPerVisitor']);
    expect($props['analytics']['current']['eventsPerVisitor'])->toBeNull();
    expect($props)->toHaveKeys(['workspace', 'project', 'analytics']);
});

it('keeps identifiers, properties and write keys out of the analytics payload', function () {
    [$workspace, $project, $user] = overviewSetup();
    overviewSeed($project, '2026-10-12 09:00:00', 'page_viewed', 'anon_secret_visitor', 'user_secret_person');

    $props = overviewProps($this->actingAs($user)->get(route('projects.show', [$workspace, $project])));
    $json = json_encode($props['analytics']);

    expect($json)->not->toContain('anon_secret_visitor')
        ->and($json)->not->toContain('user_secret_person')
        ->and($json)->not->toContain('secret_note')
        ->and($json)->not->toContain('private body')
        ->and($json)->not->toContain((string) $project->write_key)
        ->and($json)->not->toContain('write_key')
        ->and(json_encode($props))->not->toContain((string) $project->write_key);
});

it('lets every workspace role view analytics', function (string $role) {
    [$workspace, $project, $user] = overviewSetup('UTC', $role);

    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('analytics.current'));
})->with(['owner', 'admin', 'member']);

it('hides analytics from people outside the workspace', function () {
    [$workspace, $project] = overviewSetup();
    overviewSeed($project, '2026-10-12 09:00:00');
    $outsider = joinWorkspace(Workspace::factory()->create(), 'owner');

    $this->actingAs($outsider)->get(route('projects.show', [$workspace, $project]))->assertNotFound();
    // Authorization comes before validation: no validation feedback for outsiders.
    $this->actingAs($outsider)->get(route('projects.show', [$workspace, $project, 'range' => 'bogus']))
        ->assertNotFound()
        ->assertSessionHasNoErrors();

    auth()->logout();
    $this->get(route('projects.show', [$workspace, $project]))->assertRedirect(route('login'));
});

it('does not read a project through another workspace in the url', function () {
    [$workspaceA, $project, $user] = overviewSetup();
    $workspaceB = Workspace::factory()->create();
    joinWorkspace($workspaceB, 'owner', $user);
    overviewSeed($project, '2026-10-12 09:00:00');

    $this->actingAs($user)->get(route('projects.show', [$workspaceB, $project]))->assertNotFound();
});

it('keeps analytics isolated between projects and workspaces', function () {
    [$workspace, $project, $user] = overviewSetup('UTC');
    $sibling = Project::factory()->create(['workspace_id' => $workspace->id, 'timezone' => 'UTC']);
    $foreign = Project::factory()->create(['timezone' => 'UTC']);

    overviewSeed($project, '2026-10-12 09:00:00', 'own_event', 'anon_shared', 'user_shared');
    foreach ([$sibling, $foreign] as $other) {
        overviewSeed($other, '2026-10-12 09:00:00', 'other_event', 'anon_shared', 'user_shared');
        overviewSeed($other, '2026-10-12 10:00:00', 'other_event', 'anon_other', 'user_other');
    }

    // A project_id in the query string is rejected, never used to switch projects.
    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project, 'project_id' => $foreign->id]))
        ->assertSessionHasErrors('project_id');

    $this->actingAs($user)
        ->get(route('projects.show', [$workspace, $project]))
        ->assertInertia(fn ($page) => $page
            ->where('analytics.current.totalEvents', 1)
            ->where('analytics.current.uniqueVisitors', 1)
            ->where('analytics.current.identifiedUsers', 1)
            ->has('analytics.topEvents', 1)
            ->where('analytics.topEvents.0.name', 'own_event'));
});

it('computes analytics lazily for partial reloads', function () {
    [$workspace, $project, $user] = overviewSetup();
    overviewSeed($project, '2026-10-12 09:00:00');
    $url = route('projects.show', [$workspace, $project, 'range' => '30d']);

    // Analytics-only reload returns analytics and nothing else from the page.
    $this->actingAs($user)
        ->get($url, overviewPartialHeaders('analytics'))
        ->assertOk()
        ->assertJsonPath('component', 'Projects/Show')
        ->assertJsonPath('props.analytics.range.preset', '30d')
        ->assertJsonPath('props.analytics.current.totalEvents', 1)
        ->assertJsonMissingPath('props.project')
        ->assertJsonMissingPath('props.workspace');

    // A reload that excludes analytics does not run any analytics query.
    DB::flushQueryLog();
    DB::enableQueryLog();
    $this->actingAs($user)
        ->get($url, overviewPartialHeaders('project'))
        ->assertOk()
        ->assertJsonPath('props.project.name', $project->name)
        ->assertJsonMissingPath('props.analytics');
    $analyticsQueries = array_filter(DB::getQueryLog(), fn ($q) => str_contains($q['query'], 'analytics_events'));
    expect($analyticsQueries)->toBe([]);
});

it('validates partial reloads like normal loads', function () {
    [$workspace, $project, $user] = overviewSetup();

    foreach (['analytics', 'project'] as $only) {
        $this->actingAs($user)
            ->get(route('projects.show', [$workspace, $project, 'range' => 'bogus']), overviewPartialHeaders($only))
            ->assertRedirect(route('projects.show', [$workspace, $project]));
    }
});
