<?php

use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function projectPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Marketing site',
        'description' => 'Public website',
        'website_url' => 'https://example.com',
        'timezone' => 'America/New_York',
    ], $overrides);
}

it('creates, lists, edits, and archives a project inside its workspace', function () {
    $workspace = Workspace::factory()->create();
    $owner = joinWorkspace($workspace, 'owner');

    $this->actingAs($owner)
        ->post(route('projects.store', $workspace), projectPayload([
            'workspace_id' => 999,
            'archived_at' => now()->toIso8601String(),
        ]))
        ->assertRedirect();

    $project = Project::query()->first();

    expect($project)->not->toBeNull()
        ->and($project->workspace_id)->toBe($workspace->id)
        ->and($project->name)->toBe('Marketing site')
        ->and($project->website_url)->toBe('https://example.com')
        ->and($project->timezone)->toBe('America/New_York')
        ->and($project->archived_at)->toBeNull();

    $this->actingAs($owner)
        ->get(route('projects.show', [$workspace, $project]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Projects/Show')
            ->where('project.name', 'Marketing site')
            ->missing('project.workspace_id'));

    $this->actingAs($owner)
        ->patch(route('projects.update', [$workspace, $project]), projectPayload([
            'name' => 'Docs site',
            'description' => '',
            'website_url' => '',
            'workspace_id' => 999,
        ]))
        ->assertRedirect(route('projects.show', [$workspace, $project]));

    $project->refresh();

    expect($project->name)->toBe('Docs site')
        ->and($project->description)->toBeNull()
        ->and($project->website_url)->toBeNull()
        ->and($project->workspace_id)->toBe($workspace->id);

    $this->actingAs($owner)
        ->post(route('projects.archive', [$workspace, $project]))
        ->assertRedirect(route('projects.show', [$workspace, $project]));

    expect($project->fresh()->archived_at)->not->toBeNull();

    $this->actingAs($owner)
        ->post(route('projects.restore', [$workspace, $project]))
        ->assertRedirect(route('projects.show', [$workspace, $project]));

    expect($project->fresh()->archived_at)->toBeNull();
});

it('validates project details', function () {
    $workspace = Workspace::factory()->create();
    $owner = joinWorkspace($workspace, 'owner');
    Project::factory()->create([
        'workspace_id' => $workspace->id,
        'name' => 'Marketing site',
    ]);

    $this->actingAs($owner)
        ->from(route('projects.create', $workspace))
        ->post(route('projects.store', $workspace), projectPayload([
            'name' => '',
            'website_url' => 'javascript:alert(1)',
            'timezone' => 'Not/AZone',
        ]))
        ->assertRedirect(route('projects.create', $workspace))
        ->assertSessionHasErrors(['name', 'website_url', 'timezone']);

    $this->actingAs($owner)
        ->from(route('projects.create', $workspace))
        ->post(route('projects.store', $workspace), projectPayload())
        ->assertRedirect(route('projects.create', $workspace))
        ->assertSessionHasErrors('name');

    expect(Project::query()->count())->toBe(1);
});

it('lets members view projects but not change them', function () {
    $workspace = Workspace::factory()->create();
    $member = joinWorkspace($workspace, 'member');
    $project = Project::factory()->create([
        'workspace_id' => $workspace->id,
        'name' => 'App',
    ]);

    $this->actingAs($member)
        ->get(route('projects.index', $workspace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Projects/Index')
            ->where('workspace.canManage', false)
            ->where('projects.0.name', 'App'));

    $this->actingAs($member)
        ->get(route('projects.show', [$workspace, $project]))
        ->assertOk();

    $this->actingAs($member)
        ->get(route('projects.create', $workspace))
        ->assertForbidden();

    $this->actingAs($member)
        ->post(route('projects.store', $workspace), projectPayload(['name' => 'Other']))
        ->assertForbidden();

    $this->actingAs($member)
        ->patch(route('projects.update', [$workspace, $project]), projectPayload(['name' => 'Hijack']))
        ->assertForbidden();

    $this->actingAs($member)
        ->post(route('projects.archive', [$workspace, $project]))
        ->assertForbidden();

    expect($project->fresh()->name)->toBe('App')
        ->and($project->fresh()->archived_at)->toBeNull()
        ->and(Project::query()->count())->toBe(1);
});

it('lets an admin manage projects', function () {
    $workspace = Workspace::factory()->create();
    $admin = joinWorkspace($workspace, 'admin');

    $this->actingAs($admin)
        ->post(route('projects.store', $workspace), projectPayload(['name' => 'Admin app']))
        ->assertRedirect();

    expect(Project::query()->where('name', 'Admin app')->exists())->toBeTrue();
});

it('stops a member of one workspace from reading another workspace project', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $intruder = joinWorkspace($workspaceB, 'owner');
    joinWorkspace($workspaceA, 'owner');
    $project = Project::factory()->create([
        'workspace_id' => $workspaceA->id,
        'name' => 'Secret app',
    ]);

    $this->actingAs($intruder)->get(route('projects.index', $workspaceA))->assertNotFound();
    $this->actingAs($intruder)->get(route('projects.show', [$workspaceA, $project]))->assertNotFound();
    $this->actingAs($intruder)->patch(route('projects.update', [$workspaceA, $project]), projectPayload([
        'name' => 'Stolen',
    ]))->assertNotFound();
    $this->actingAs($intruder)->post(route('projects.store', $workspaceA), projectPayload([
        'name' => 'Planted',
    ]))->assertNotFound();

    expect($project->fresh()->name)->toBe('Secret app')
        ->and(Project::query()->where('name', 'Planted')->exists())->toBeFalse();
});

it('does not resolve a project through a different workspace url', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $user = User::factory()->create();
    joinWorkspace($workspaceA, 'owner', $user);
    joinWorkspace($workspaceB, 'owner', $user);
    $project = Project::factory()->create([
        'workspace_id' => $workspaceA->id,
        'name' => 'Only A',
    ]);

    $this->actingAs($user)
        ->get(route('projects.show', [$workspaceB, $project]))
        ->assertNotFound();

    $this->actingAs($user)
        ->patch(route('projects.update', [$workspaceB, $project]), projectPayload(['name' => 'Moved']))
        ->assertNotFound();

    expect($project->fresh()->workspace_id)->toBe($workspaceA->id)
        ->and($project->fresh()->name)->toBe('Only A');
});

it('sends guests away from project pages', function () {
    $workspace = Workspace::factory()->create();
    $project = Project::factory()->create(['workspace_id' => $workspace->id]);

    $this->get(route('projects.index', $workspace))->assertRedirect(route('login'));
    $this->get(route('projects.show', [$workspace, $project]))->assertRedirect(route('login'));
    $this->post(route('projects.store', $workspace), projectPayload())->assertRedirect(route('login'));
});
