<?php

use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMembership;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('does not create a workspace during registration or login', function () {
    $this->post('/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'password' => 'Correct-password-1',
        'password_confirmation' => 'Correct-password-1',
    ])->assertRedirect(route('dashboard'));

    expect(Workspace::query()->count())->toBe(0);

    auth()->logout();

    $this->post('/login', [
        'email' => 'ada@example.com',
        'password' => 'Correct-password-1',
    ])->assertRedirect(route('dashboard'));

    expect(Workspace::query()->count())->toBe(0);
});

it('creates a workspace and makes the creator the owner', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/workspaces', [
        'name' => '  Ada Lab  ',
        'role' => 'member',
    ])->assertRedirect();

    $workspace = Workspace::query()->first();
    $membership = WorkspaceMembership::query()->first();

    expect($workspace)->not->toBeNull()
        ->and($workspace->name)->toBe('Ada Lab')
        ->and(WorkspaceMembership::query()->count())->toBe(1)
        ->and($membership->user_id)->toBe($user->id)
        ->and($membership->role->value)->toBe('owner');

    $this->actingAs($user)
        ->get(route('workspaces.show', $workspace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Workspaces/Show')
            ->where('workspace.name', 'Ada Lab')
            ->where('workspace.role', 'owner')
            ->where('workspace.canManage', true)
            ->missing('workspace.email'));
});

it('lists only workspaces the user belongs to', function () {
    $owner = User::factory()->create();
    $mine = Workspace::factory()->create(['name' => 'Mine']);
    $theirs = Workspace::factory()->create(['name' => 'Theirs']);
    joinWorkspace($mine, 'owner', $owner);
    joinWorkspace($theirs, 'owner');

    $this->actingAs($owner)
        ->get('/workspaces')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Workspaces/Index')
            ->has('workspaces', 1)
            ->where('workspaces.0.name', 'Mine')
            ->where('workspaces.0.role', 'owner'));
});

it('lets owners and admins rename a workspace and blocks members', function () {
    $workspace = Workspace::factory()->create(['name' => 'Original']);
    $owner = joinWorkspace($workspace, 'owner');
    $admin = joinWorkspace($workspace, 'admin');
    $member = joinWorkspace($workspace, 'member');

    $this->actingAs($member)
        ->patch(route('workspaces.update', $workspace), ['name' => 'Hijack'])
        ->assertForbidden();

    expect($workspace->fresh()->name)->toBe('Original');

    $this->actingAs($admin)
        ->patch(route('workspaces.update', $workspace), ['name' => 'Renamed'])
        ->assertRedirect(route('workspaces.show', $workspace));

    expect($workspace->fresh()->name)->toBe('Renamed');

    $this->actingAs($owner)
        ->get(route('workspaces.edit', $workspace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Workspaces/Settings'));

    $this->actingAs($member)
        ->get(route('workspaces.edit', $workspace))
        ->assertForbidden();
});

it('shows members and roles without email addresses', function () {
    $workspace = Workspace::factory()->create();
    $owner = joinWorkspace($workspace, 'owner');
    $owner->update(['name' => 'Ada Lovelace']);
    joinWorkspace($workspace, 'member')->update(['name' => 'Grace Hopper']);

    $this->actingAs($owner)
        ->get(route('workspaces.members', $workspace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Workspaces/Members')
            ->has('members', 2)
            ->where('members.0.role', 'owner')
            ->where('members.0.name', 'Ada Lovelace')
            ->missing('members.0.email')
            ->where('members.1.role', 'member'));
});

it('hides a workspace from people who are not members', function () {
    $workspace = Workspace::factory()->create();
    joinWorkspace($workspace, 'owner');
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->get(route('workspaces.show', $workspace))->assertNotFound();
    $this->actingAs($outsider)->get(route('workspaces.members', $workspace))->assertNotFound();
    $this->actingAs($outsider)->patch(route('workspaces.update', $workspace), [
        'name' => 'Taken',
    ])->assertNotFound();

    expect($workspace->fresh()->name)->not->toBe('Taken');
});

it('sends guests to login', function () {
    $workspace = Workspace::factory()->create();

    $this->get('/workspaces')->assertRedirect(route('login'));
    $this->get(route('workspaces.show', $workspace))->assertRedirect(route('login'));
    $this->post('/workspaces', ['name' => 'Guest lab'])->assertRedirect(route('login'));
});

it('rejects an empty workspace name', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from('/workspaces/create')
        ->post('/workspaces', ['name' => '   '])
        ->assertRedirect('/workspaces/create')
        ->assertSessionHasErrors('name');

    expect(Workspace::query()->count())->toBe(0);
});

it('deletes memberships and projects with the workspace', function () {
    $workspace = Workspace::factory()->create();
    joinWorkspace($workspace, 'owner');
    $project = Project::factory()->create(['workspace_id' => $workspace->id]);

    $workspace->delete();

    expect(Project::query()->find($project->id))->toBeNull()
        ->and(WorkspaceMembership::query()->count())->toBe(0);
});
