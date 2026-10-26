<?php

use App\Models\AnalyticsEvent;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Support\WriteKey;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    config([
        'insight.ingestion_per_minute' => 60,
        'insight.events_per_page' => 25,
    ]);
});

function trackedProject(): Project
{
    $workspace = Workspace::factory()->create(['name' => 'Northwind Notes']);
    joinWorkspace($workspace, 'owner');

    return Project::factory()->create([
        'workspace_id' => $workspace->id,
        'name' => 'Field notes',
    ]);
}

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function eventPayload(Project $project, array $overrides = []): array
{
    return array_merge([
        'write_key' => $project->write_key,
        'name' => 'note_created',
        'anonymous_id' => 'anon_reader001',
        'occurred_at' => now()->toIso8601String(),
        'event_id' => 'evt_note000000001',
        'properties' => ['notebook' => 'Field notes'],
    ], $overrides);
}

it('accepts an event for the project identified by the write key', function () {
    $project = trackedProject();
    $other = Project::factory()->create();

    $this->postJson('/api/v1/events', eventPayload($project, [
        'project_id' => $other->id,
        'user_id' => 'reader_42',
    ]))
        ->assertOk()
        ->assertJson(['status' => 'accepted'])
        ->assertJsonMissingPath('project');

    $event = AnalyticsEvent::query()->first();

    expect($event)->not->toBeNull()
        ->and($event->project_id)->toBe($project->id)
        ->and($event->name)->toBe('note_created')
        ->and($event->anonymous_id)->toBe('anon_reader001')
        ->and($event->identified_user_id)->toBe('reader_42')
        ->and($event->properties)->toBe(['notebook' => 'Field notes'])
        ->and($event->client_event_id)->toBe('evt_note000000001')
        ->and($event->received_at)->not->toBeNull()
        ->and(AnalyticsEvent::query()->where('project_id', $other->id)->exists())->toBeFalse();
});

it('rejects an unknown or malformed write key without naming the project', function () {
    $project = trackedProject();

    $unknown = $this->postJson('/api/v1/events', eventPayload($project, [
        'write_key' => 'iw_'.str_repeat('f', 32),
    ]));

    $unknown->assertUnauthorized();
    expect($unknown->json('message'))->toBe('The write key is not valid.')
        ->and($unknown->getContent())->not->toContain($project->name);

    $this->postJson('/api/v1/events', eventPayload($project, [
        'write_key' => 'not-a-key',
    ]))->assertUnprocessable();

    expect(AnalyticsEvent::query()->count())->toBe(0);
});

it('rejects events for an archived project', function () {
    $project = trackedProject();
    $project->update(['archived_at' => now()]);

    $this->postJson('/api/v1/events', eventPayload($project))
        ->assertForbidden()
        ->assertJson(['message' => 'This write key is not accepting events.']);

    expect(AnalyticsEvent::query()->count())->toBe(0);
});

it('validates the event payload and the property size', function () {
    $project = trackedProject();

    $this->postJson('/api/v1/events', eventPayload($project, [
        'name' => '1bad',
        'anonymous_id' => 'short',
        'occurred_at' => now()->subDays(31)->toIso8601String(),
    ]))->assertUnprocessable()->assertJsonValidationErrors(['name', 'anonymous_id', 'occurred_at']);

    $this->postJson('/api/v1/events', eventPayload($project, [
        'properties' => ['notebook' => str_repeat('a', 9000)],
    ]))->assertUnprocessable()->assertJsonValidationErrors('properties');

    $this->call('POST', '/api/v1/events', [], [], [], [
        'CONTENT_TYPE' => 'text/plain',
        'HTTP_ACCEPT' => 'application/json',
    ], 'hello')->assertStatus(415);

    $this->postJson('/api/v1/events', eventPayload($project, [
        'properties' => ['notebook' => str_repeat('b', 20000)],
    ]))->assertStatus(413);

    expect(AnalyticsEvent::query()->count())->toBe(0);
});

it('stores one row when the same event id is repeated for a project', function () {
    $project = trackedProject();
    $other = Project::factory()->create();

    $this->postJson('/api/v1/events', eventPayload($project))->assertJson(['status' => 'accepted']);
    $this->postJson('/api/v1/events', eventPayload($project))->assertJson(['status' => 'duplicate']);
    $this->postJson('/api/v1/events', eventPayload($other, [
        'event_id' => 'evt_note000000001',
    ]))->assertJson(['status' => 'accepted']);

    $this->postJson('/api/v1/events', eventPayload($project, [
        'event_id' => null,
    ]))->assertJson(['status' => 'accepted']);
    $this->postJson('/api/v1/events', eventPayload($project, [
        'event_id' => null,
    ]))->assertJson(['status' => 'accepted']);

    expect(AnalyticsEvent::query()->where('project_id', $project->id)->count())->toBe(3)
        ->and(AnalyticsEvent::query()->where('project_id', $other->id)->count())->toBe(1);
});

it('limits repeated ingestion for one write key', function () {
    config(['insight.ingestion_per_minute' => 2]);
    $project = trackedProject();

    $this->postJson('/api/v1/events', eventPayload($project, ['event_id' => 'evt_limit000000001']))->assertOk();
    $this->postJson('/api/v1/events', eventPayload($project, ['event_id' => 'evt_limit000000002']))->assertOk();

    $this->postJson('/api/v1/events', eventPayload($project, ['event_id' => 'evt_limit000000003']))
        ->assertStatus(429)
        ->assertJson(['message' => 'Too many events.'])
        ->assertHeader('Retry-After');

    expect(AnalyticsEvent::query()->count())->toBe(2);

    config(['insight.ingestion_per_minute' => 60]);
});

it('allows browser clients to call the ingestion endpoint', function () {
    $response = $this->call('OPTIONS', '/api/v1/events', [], [], [], [
        'HTTP_ORIGIN' => 'https://notes.example',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type',
    ]);

    $response->assertNoContent();
    $response->assertHeader('Access-Control-Allow-Origin', '*');
    $response->assertHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
});

it('rotates a write key for owners and admins only', function () {
    $workspace = Workspace::factory()->create();
    $owner = joinWorkspace($workspace, 'owner');
    $admin = joinWorkspace($workspace, 'admin');
    $member = joinWorkspace($workspace, 'member');
    $project = Project::factory()->create([
        'workspace_id' => $workspace->id,
        'name' => 'Field notes',
    ]);
    $original = $project->write_key;

    $this->actingAs($member)
        ->post(route('projects.write-key.rotate', [$workspace, $project]))
        ->assertForbidden();

    expect($project->fresh()->write_key)->toBe($original);

    $this->actingAs($admin)
        ->post(route('projects.write-key.rotate', [$workspace, $project]))
        ->assertRedirect(route('projects.tracking', [$workspace, $project]));

    $rotated = $project->fresh()->write_key;
    expect($rotated)->not->toBe($original);

    $this->postJson('/api/v1/events', eventPayload($project, ['write_key' => $original]))
        ->assertUnauthorized();
    $this->postJson('/api/v1/events', eventPayload($project, [
        'write_key' => $rotated,
        'event_id' => 'evt_afterrotate0001',
    ]))->assertOk();

    $this->actingAs($owner)
        ->patch(route('projects.update', [$workspace, $project]), [
            'name' => 'Field notes',
            'timezone' => 'UTC',
            'write_key' => WriteKey::generate(),
        ])->assertRedirect();

    expect($project->fresh()->write_key)->toBe($rotated);
});

it('shows recent events only inside the authorized project', function () {
    config(['insight.events_per_page' => 2]);

    $workspace = Workspace::factory()->create();
    $member = joinWorkspace($workspace, 'member');
    $project = Project::factory()->create([
        'workspace_id' => $workspace->id,
        'name' => 'Field notes',
        'timezone' => 'UTC',
    ]);
    $otherWorkspace = Workspace::factory()->create();
    $other = Project::factory()->create(['workspace_id' => $otherWorkspace->id]);

    foreach ([
        ['note_created', 3],
        ['note_edited', 2],
        ['note_opened', 1],
    ] as [$name, $minutes]) {
        $project->analyticsEvents()->create([
            'name' => $name,
            'anonymous_id' => 'anon_reader001',
            'properties' => ['notebook' => 'Field notes'],
            'occurred_at' => now()->subMinutes($minutes),
            'received_at' => now()->subMinutes($minutes),
        ]);
    }

    $other->analyticsEvents()->create([
        'name' => 'plan_saved',
        'anonymous_id' => 'anon_other0001',
        'occurred_at' => now(),
        'received_at' => now(),
    ]);

    $this->get(route('projects.events', [$workspace, $project]))->assertRedirect(route('login'));

    $this->actingAs($member)
        ->get(route('projects.events', [$workspace, $project]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Projects/Events')
            ->has('events', 2)
            ->where('events.0.name', 'note_opened')
            ->where('events.1.name', 'note_edited')
            ->where('events.0.anonymousId', 'anon_reader001')
            ->where('nextPage', 2)
            ->missing('project.writeKey')
            ->missing('events.0.email'));

    $this->actingAs($member)
        ->get(route('projects.events', [$workspace, $project]).'?page=2')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('events', 1)
            ->where('events.0.name', 'note_created')
            ->where('previousPage', 1)
            ->where('nextPage', null));

    $outsider = User::factory()->create();
    $this->actingAs($outsider)->get(route('projects.events', [$workspace, $project]))->assertNotFound();
    $this->actingAs($member)->get(route('projects.events', [$otherWorkspace, $project]))->assertNotFound();

    config(['insight.events_per_page' => 25]);
});

it('lets members view tracking setup and keeps events append-only', function () {
    $workspace = Workspace::factory()->create();
    $member = joinWorkspace($workspace, 'member');
    $project = Project::factory()->create([
        'workspace_id' => $workspace->id,
        'name' => 'Field notes',
    ]);
    $event = $project->analyticsEvents()->create([
        'name' => 'note_created',
        'anonymous_id' => 'anon_reader001',
        'occurred_at' => now(),
        'received_at' => now(),
    ]);

    $this->actingAs($member)
        ->get(route('projects.tracking', [$workspace, $project]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Projects/Tracking')
            ->where('project.writeKey', $project->write_key)
            ->where('project.canManage', false)
            ->where('endpoint', url('/api/v1/events')));

    expect($event->update(['name' => 'changed']))->toBeFalse()
        ->and($event->fresh()->name)->toBe('note_created')
        ->and($event->delete())->toBeFalse()
        ->and(AnalyticsEvent::query()->find($event->id))->not->toBeNull();

    $workspace->delete();

    expect(AnalyticsEvent::query()->find($event->id))->toBeNull();
});
