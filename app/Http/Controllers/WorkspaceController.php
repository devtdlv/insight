<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Http\Requests\StoreWorkspaceRequest;
use App\Http\Requests\UpdateWorkspaceRequest;
use App\Models\Workspace;
use App\Support\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Workspaces/Index');
    }

    public function create(): Response
    {
        return Inertia::render('Workspaces/Create');
    }

    public function store(StoreWorkspaceRequest $request): RedirectResponse
    {
        $user = Tenant::user($request);

        $workspace = DB::transaction(function () use ($request, $user): Workspace {
            $workspace = Workspace::query()->create($request->safe()->only(['name']));
            $workspace->memberships()->create([
                'user_id' => $user->id,
                'role' => WorkspaceRole::Owner,
            ]);

            return $workspace;
        });

        return redirect()
            ->route('workspaces.show', $workspace)
            ->with('status', 'Workspace created.');
    }

    public function show(Request $request, Workspace $workspace): Response
    {
        $role = Tenant::role($request, $workspace);
        $projects = $workspace->projects()->orderBy('name')->get();

        return Inertia::render('Workspaces/Show', [
            'workspace' => $this->workspacePayload($workspace, $role),
            'projects' => $projects->map(fn ($project) => [
                'id' => $project->id,
                'name' => $project->name,
                'archivedAt' => $project->archived_at?->toIso8601String(),
            ])->values(),
            'memberCount' => $workspace->memberships()->count(),
        ]);
    }

    public function edit(Request $request, Workspace $workspace): Response
    {
        $role = Tenant::manage($request, $workspace);

        return Inertia::render('Workspaces/Settings', [
            'workspace' => $this->workspacePayload($workspace, $role),
        ]);
    }

    public function update(UpdateWorkspaceRequest $request, Workspace $workspace): RedirectResponse
    {
        $workspace->update($request->safe()->only(['name']));

        return redirect()
            ->route('workspaces.show', $workspace)
            ->with('status', 'Workspace name saved.');
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
}
