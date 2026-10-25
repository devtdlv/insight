<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Project;
use App\Models\Workspace;
use App\Support\Tenant;
use App\Support\Timezones;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    public function index(Request $request, Workspace $workspace): Response
    {
        $role = Tenant::role($request, $workspace);

        return Inertia::render('Projects/Index', [
            'workspace' => $this->workspacePayload($workspace, $role),
            'projects' => $this->projectList($workspace, $role->canManage()),
        ]);
    }

    public function create(Request $request, Workspace $workspace): Response
    {
        $role = Tenant::manage($request, $workspace);

        return Inertia::render('Projects/Create', [
            'workspace' => $this->workspacePayload($workspace, $role),
            'timezones' => Timezones::options(),
        ]);
    }

    public function store(StoreProjectRequest $request, Workspace $workspace): RedirectResponse
    {
        $project = $workspace->projects()->create($request->safe()->only([
            'name',
            'description',
            'website_url',
            'timezone',
        ]));

        return redirect()
            ->route('projects.show', [$workspace, $project])
            ->with('status', 'Project created.');
    }

    public function show(Request $request, Workspace $workspace, Project $project): Response
    {
        Tenant::project($workspace, $project);
        $role = Tenant::role($request, $workspace);
        abort_unless($request->user()?->can('view', $project) === true, 404);

        return Inertia::render('Projects/Show', [
            'workspace' => $this->workspacePayload($workspace, $role),
            'project' => $this->projectPayload($project, $role->canManage()),
        ]);
    }

    public function edit(Request $request, Workspace $workspace, Project $project): Response
    {
        $role = Tenant::manageProject($request, $workspace, $project);

        return Inertia::render('Projects/Settings', [
            'workspace' => $this->workspacePayload($workspace, $role),
            'project' => $this->projectPayload($project, true),
            'timezones' => Timezones::options($project->timezone),
        ]);
    }

    public function update(UpdateProjectRequest $request, Workspace $workspace, Project $project): RedirectResponse
    {
        $project->update($request->safe()->only([
            'name',
            'description',
            'website_url',
            'timezone',
        ]));

        return redirect()
            ->route('projects.show', [$workspace, $project])
            ->with('status', 'Project saved.');
    }

    public function archive(Request $request, Workspace $workspace, Project $project): RedirectResponse
    {
        Tenant::manageProject($request, $workspace, $project);
        $project->update(['archived_at' => now()]);

        return redirect()
            ->route('projects.show', [$workspace, $project])
            ->with('status', 'Project archived.');
    }

    public function restore(Request $request, Workspace $workspace, Project $project): RedirectResponse
    {
        Tenant::manageProject($request, $workspace, $project);
        $project->update(['archived_at' => null]);

        return redirect()
            ->route('projects.show', [$workspace, $project])
            ->with('status', 'Project restored.');
    }

    /**
     * @return array{id: int, name: string, role: string, canManage: bool}
     */
    private function workspacePayload(Workspace $workspace, WorkspaceRole $role): array
    {
        return [
            'id' => $workspace->id,
            'name' => $workspace->name,
            'role' => $role->value,
            'canManage' => $role->canManage(),
        ];
    }

    /**
     * @return array{id: int, name: string, description: string|null, websiteUrl: string|null, timezone: string, archivedAt: string|null, canManage: bool}
     */
    private function projectPayload(Project $project, bool $canManage): array
    {
        return [
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'websiteUrl' => $project->website_url,
            'timezone' => $project->timezone,
            'archivedAt' => $project->archived_at?->toIso8601String(),
            'canManage' => $canManage,
        ];
    }

    /**
     * @return Collection<int, array{id: int, name: string, description: string|null, websiteUrl: string|null, timezone: string, archivedAt: string|null, canManage: bool}>
     */
    private function projectList(Workspace $workspace, bool $canManage): Collection
    {
        return $workspace->projects()->orderBy('name')->get()->map(
            fn (Project $project) => $this->projectPayload($project, $canManage),
        )->values();
    }
}
