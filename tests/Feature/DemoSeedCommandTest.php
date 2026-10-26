<?php

use App\Models\AnalyticsEvent;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Rules\EventProperties;
use App\Support\Demo\DemoAnalyticsGenerator;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Testing\PendingCommand;

uses(RefreshDatabase::class);

function runDemoSeed(array $options = []): PendingCommand
{
    app()['env'] = 'local';

    return test()->artisan('insight:seed-demo', $options);
}

function demoOwner(): User
{
    return User::factory()->create(['email' => 'demo-owner@example.test']);
}

function seedDemo(int $seed = 42): Project
{
    demoOwner();
    runDemoSeed(['--user' => 'demo-owner@example.test', '--seed' => $seed])->assertExitCode(0);

    return Project::query()->where('name', 'Atlas Demo')->firstOrFail();
}

it('refuses to run outside the local environment', function () {
    demoOwner();
    app()['env'] = 'production';

    $this->artisan('insight:seed-demo', ['--user' => 'demo-owner@example.test'])
        ->expectsOutputToContain('only runs when APP_ENV is "local"')
        ->assertExitCode(1);

    expect(Workspace::query()->count())->toBe(0)
        ->and(AnalyticsEvent::query()->count())->toBe(0);
});

it('refuses to run in the testing environment', function () {
    demoOwner();

    $this->artisan('insight:seed-demo', ['--user' => 'demo-owner@example.test'])->assertExitCode(1);

    expect(Workspace::query()->count())->toBe(0);
});

it('requires a user option and a known user', function () {
    runDemoSeed()->expectsOutputToContain('--user=<email>')->assertExitCode(1);

    runDemoSeed(['--user' => 'nobody@example.test'])
        ->expectsOutputToContain('No user with the email nobody@example.test')
        ->assertExitCode(1);

    expect(Workspace::query()->count())->toBe(0)
        ->and(User::query()->count())->toBe(0);
});

it('rejects a non-integer seed', function () {
    demoOwner();

    runDemoSeed(['--user' => 'demo-owner@example.test', '--seed' => 'abc'])->assertExitCode(1);

    expect(Workspace::query()->count())->toBe(0);
});

it('creates the demo workspace and project owned by the given user', function () {
    $project = seedDemo();
    $owner = User::query()->where('email', 'demo-owner@example.test')->firstOrFail();
    $workspace = $project->workspace;

    expect($workspace->name)->toBe('Showcase Labs')
        ->and($project->timezone)->toBe('America/New_York')
        ->and($project->description)->toContain('Fictional')
        ->and($project->write_key)->toMatch('/^iw_[a-f0-9]{32}$/')
        ->and($workspace->memberships()->count())->toBe(1)
        ->and($workspace->roleFor($owner)?->value)->toBe('owner')
        ->and(Workspace::query()->count())->toBe(1)
        ->and(User::query()->count())->toBe(1);
});

it('generates the expected volume, identities, and event types', function () {
    $project = seedDemo();
    $events = AnalyticsEvent::query()->where('project_id', $project->id);

    expect($events->count())->toBe(12000)
        ->and($events->distinct()->count('anonymous_id'))->toBe(1200)
        ->and($events->whereNotNull('identified_user_id')->distinct()->count('identified_user_id'))->toBe(300)
        ->and(AnalyticsEvent::query()->distinct()->pluck('name')->sort()->values()->all())
        ->toBe(collect(DemoAnalyticsGenerator::EVENT_NAMES)->sort()->values()->all());

    $counts = AnalyticsEvent::query()->selectRaw('name, count(*) as total')->groupBy('name')->pluck('total', 'name');

    expect($counts['page_view'])->toBeGreaterThan($counts['signup_completed'] * 5)
        ->and($counts['signup_started'])->toBeGreaterThan($counts['signup_completed'])
        ->and($counts['signup_completed'])->toBe(300)
        ->and($counts['report_viewed'])->toBeGreaterThan($counts['report_exported'] * 3);
});

it('uses unique client event ids and valid fictional identifiers', function () {
    seedDemo();

    $ids = AnalyticsEvent::query()->pluck('client_event_id');
    expect($ids->unique()->count())->toBe($ids->count());

    foreach (AnalyticsEvent::query()->distinct()->pluck('anonymous_id') as $anonymousId) {
        expect($anonymousId)->toMatch('/^[A-Za-z0-9_-]{8,64}$/');
    }

    $users = AnalyticsEvent::query()->whereNotNull('identified_user_id')->distinct()->pluck('identified_user_id');

    foreach ($users as $userId) {
        expect($userId)->toMatch('/^usr_[A-Za-z0-9]{14}$/')->not->toContain('@');
    }

    $anonymous = AnalyticsEvent::query()->distinct()->pluck('anonymous_id');
    expect($anonymous->map(fn (string $id) => strtolower($id))->unique()->count())->toBe($anonymous->count())
        ->and($anonymous->contains(fn (string $id) => $id !== strtolower($id)))->toBeTrue();

    $properties = AnalyticsEvent::query()->limit(500)->pluck('properties');
    foreach ($properties as $values) {
        expect(json_encode($values))->not->toContain('@')->and($values)->toHaveKey('demo_data', true);
    }
});

it('never creates future events and keeps received_at consistent', function () {
    CarbonImmutable::setTestNow('2026-10-14 12:00:00');
    Carbon::setTestNow('2026-10-14 12:00:00');

    seedDemo();

    $now = '2026-10-14 12:00:00';
    expect(AnalyticsEvent::query()->where('occurred_at', '>', $now)->count())->toBe(0)
        ->and(AnalyticsEvent::query()->where('received_at', '>', $now)->count())->toBe(0)
        ->and(AnalyticsEvent::query()->whereColumn('received_at', '<', 'occurred_at')->count())->toBe(0)
        ->and(AnalyticsEvent::query()->where('occurred_at', '<', '2026-07-16 12:00:00')->count())->toBe(0);

    Carbon::setTestNow();
    CarbonImmutable::setTestNow();
});

it('shows weekday activity, growth, and returning visitors in the project timezone', function () {
    seedDemo();

    $rows = AnalyticsEvent::query()->get(['anonymous_id', 'occurred_at']);
    $perDay = [];
    $visitorDays = [];

    foreach ($rows as $row) {
        $local = $row->occurred_at->copy()->setTimezone('America/New_York');
        $key = $local->toDateString();
        $perDay[$key] = ($perDay[$key] ?? 0) + 1;
        $visitorDays[$row->anonymous_id][$key] = true;
    }

    $weekday = $weekend = $weekdayDays = $weekendDays = 0;

    foreach ($perDay as $date => $count) {
        if (CarbonImmutable::parse($date)->isWeekend()) {
            $weekend += $count;
            $weekendDays++;
        } else {
            $weekday += $count;
            $weekdayDays++;
        }
    }

    expect($weekday / $weekdayDays)->toBeGreaterThan(1.3 * ($weekend / $weekendDays));

    ksort($perDay);
    $values = array_values($perDay);
    $third = intdiv(count($values), 3);
    expect(array_sum(array_slice($values, -$third)))->toBeGreaterThan(array_sum(array_slice($values, 0, $third)) * 1.2)
        ->and(count(array_unique($values)))->toBeGreaterThan(40);

    $returning = collect($visitorDays)->filter(fn (array $days) => count($days) >= 2)->count();
    expect($returning)->toBeGreaterThan(250)->toBeLessThan(1000);
});

it('tells a coherent identification story for identified visitors', function () {
    seedDemo();

    $user = AnalyticsEvent::query()->whereNotNull('identified_user_id')->value('identified_user_id');
    $anonymousId = AnalyticsEvent::query()->where('identified_user_id', $user)->value('anonymous_id');

    $mapping = AnalyticsEvent::query()->whereNotNull('identified_user_id')
        ->selectRaw('identified_user_id, count(distinct anonymous_id) as visitors')
        ->groupBy('identified_user_id')->pluck('visitors');
    expect($mapping->every(fn ($count) => (int) $count === 1))->toBeTrue();

    $history = AnalyticsEvent::query()->where('anonymous_id', $anonymousId)->orderBy('occurred_at')->orderBy('id')->get();
    $completed = $history->search(fn ($event) => $event->name === 'signup_completed');
    expect($completed)->not->toBeFalse()
        ->and($history->first()->identified_user_id)->toBeNull();

    $anonymousBefore = AnalyticsEvent::query()->whereNull('identified_user_id')->where('name', 'signup_completed')->count();
    expect($anonymousBefore)->toBe(0);
});

it('does not create demo data twice', function () {
    $project = seedDemo();
    $events = AnalyticsEvent::query()->count();

    runDemoSeed(['--user' => 'demo-owner@example.test'])
        ->expectsOutputToContain('Demo data already exists')
        ->assertExitCode(1);

    expect(Workspace::query()->count())->toBe(1)
        ->and(Project::query()->count())->toBe(1)
        ->and(AnalyticsEvent::query()->count())->toBe($events)
        ->and(Project::query()->value('id'))->toBe($project->id);
});

it('does not touch other workspaces, projects, or events', function () {
    $owner = demoOwner();
    $other = Workspace::factory()->create(['name' => 'Northstar Labs']);
    joinWorkspace($other, 'owner', $owner);
    $orbit = Project::factory()->create(['workspace_id' => $other->id, 'name' => 'Orbit', 'timezone' => 'Asia/Singapore']);
    AnalyticsEvent::query()->insert([
        'project_id' => $orbit->id,
        'name' => 'real_event',
        'anonymous_id' => 'visitor_abcd',
        'identified_user_id' => null,
        'properties' => null,
        'occurred_at' => '2026-10-01 00:00:00',
        'received_at' => '2026-10-01 00:00:01',
        'client_event_id' => 'orbit_event_1',
    ]);

    $before = [
        'workspaces' => DB::table('workspaces')->get()->all(),
        'projects' => DB::table('projects')->get()->all(),
        'events' => DB::table('analytics_events')->where('project_id', $orbit->id)->get()->all(),
        'users' => DB::table('users')->get()->all(),
    ];

    runDemoSeed(['--user' => 'demo-owner@example.test'])->assertExitCode(0);

    $demo = Project::query()->where('name', 'Atlas Demo')->firstOrFail();

    expect(DB::table('workspaces')->where('id', $other->id)->get()->all())->toEqual([$before['workspaces'][0]])
        ->and(DB::table('projects')->where('id', $orbit->id)->get()->all())->toEqual($before['projects'])
        ->and(DB::table('analytics_events')->where('project_id', $orbit->id)->get()->all())->toEqual($before['events'])
        ->and(DB::table('users')->get()->all())->toEqual($before['users'])
        ->and(AnalyticsEvent::query()->where('project_id', $orbit->id)->count())->toBe(1)
        ->and(AnalyticsEvent::query()->where('project_id', $demo->id)->count())->toBe(12000)
        ->and(AnalyticsEvent::query()->count())->toBe(12001);
});

it('is deterministic for a seed and different for another seed', function () {
    $now = CarbonImmutable::parse('2026-10-14 12:00:00', 'UTC');
    $make = fn (int $seed) => iterator_to_array(
        (new DemoAnalyticsGenerator($seed, $now, 'America/New_York'))->events(),
        false,
    );

    $first = $make(7);

    expect($make(7))->toBe($first)
        ->and($make(8))->not->toBe($first)
        ->and(count($first))->toBe(12000);

    $generator = new DemoAnalyticsGenerator(7, $now, 'America/New_York');
    expect(iterator_to_array($generator->events(), false))->toBe($first)
        ->and(iterator_to_array($generator->events(), false))->toBe($first);
});

it('produces rows that satisfy the ingestion field rules', function () {
    seedDemo();

    $rules = [
        'name' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/'],
        'anonymous_id' => ['required', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
        'identified_user_id' => ['nullable', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
        'client_event_id' => ['required', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
        'properties' => ['nullable', 'array', new EventProperties],
    ];

    foreach (AnalyticsEvent::query()->inRandomOrder()->limit(300)->get() as $event) {
        $validator = Validator::make($event->only(array_keys($rules)), $rules);
        expect($validator->passes())->toBeTrue();
    }
});

it('is not registered with migrations, seeders, or the scheduler', function () {
    expect(file_get_contents(base_path('database/seeders/DatabaseSeeder.php')))->not->toContain('demo')
        ->and(file_get_contents(base_path('routes/console.php')))->not->toContain('seed-demo');
});
