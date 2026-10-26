<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Workspace;
use App\Support\Tenant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectTrackingController extends Controller
{
    public function show(Request $request, Workspace $workspace, Project $project): Response
    {
        Tenant::project($workspace, $project);
        $role = Tenant::role($request, $workspace);
        abort_unless($request->user()?->can('view', $project) === true, 404);

        return Inertia::render('Projects/Tracking', [
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'role' => $role->value,
                'canManage' => $role->canManage(),
            ],
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'timezone' => $project->timezone,
                'archivedAt' => $project->archived_at?->toIso8601String(),
                'writeKey' => $project->write_key,
                'canManage' => $role->canManage(),
            ],
            'endpoint' => url('/api/v1/events'),
        ]);
    }

    public function rotate(Request $request, Workspace $workspace, Project $project): RedirectResponse
    {
        Tenant::manageProject($request, $workspace, $project);
        $project->rotateWriteKey();

        return redirect()
            ->route('projects.tracking', [$workspace, $project])
            ->with('status', 'Write key rotated.');
    }
}
