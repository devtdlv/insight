<?php

use App\Models\Project;
use App\Models\Workspace;
use App\Support\Timezones;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('offers Asia/Manila and only real timezone identifiers', function () {
    $zones = Timezones::options();

    expect($zones)->toContain('Asia/Manila')
        ->and($zones)->not->toContain('America/Adak');

    foreach ($zones as $zone) {
        expect(in_array($zone, timezone_identifiers_list(), true))->toBeTrue();
    }

    expect(Timezones::options('America/Adak'))->toContain('America/Adak');
});

it('accepts Asia/Manila and keeps a stored timezone selectable', function () {
    $workspace = Workspace::factory()->create();
    $owner = joinWorkspace($workspace, 'owner');

    $this->actingAs($owner)
        ->get(route('projects.create', $workspace))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where(
            'timezones',
            fn ($zones) => collect($zones)->contains('Asia/Manila'),
        ));

    $this->actingAs($owner)
        ->post(route('projects.store', $workspace), [
            'name' => 'Harbor notes',
            'description' => 'A notebook for the harbor team',
            'website_url' => 'https://notes.example',
            'timezone' => 'Asia/Manila',
        ])
        ->assertRedirect();

    $project = Project::query()->where('name', 'Harbor notes')->first();

    expect($project)->not->toBeNull()
        ->and($project->timezone)->toBe('Asia/Manila');

    $stored = Project::factory()->create([
        'workspace_id' => $workspace->id,
        'name' => 'Aleutian notes',
        'timezone' => 'America/Adak',
    ]);

    $this->actingAs($owner)
        ->get(route('projects.edit', [$workspace, $stored]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('project.timezone', 'America/Adak')
            ->where('timezones', fn ($zones) => collect($zones)->contains('America/Adak')));
});
