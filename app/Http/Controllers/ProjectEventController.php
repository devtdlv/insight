<?php

namespace App\Http\Controllers;

use App\Models\AnalyticsEvent;
use App\Models\Project;
use App\Models\Workspace;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectEventController extends Controller
{
    public function index(Request $request, Workspace $workspace, Project $project): Response
    {
        Tenant::project($workspace, $project);
        $role = Tenant::role($request, $workspace);
        abort_unless($request->user()?->can('view', $project) === true, 404);

        $events = $project->analyticsEvents()
            ->orderByDesc('received_at')
            ->orderByDesc('id')
            ->simplePaginate(max(1, (int) config('insight.events_per_page')))
            ->withQueryString();

        return Inertia::render('Projects/Events', [
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
                'canManage' => $role->canManage(),
            ],
            'events' => $events->getCollection()->map(fn (AnalyticsEvent $event): array => [
                'id' => $event->id,
                'name' => $event->name,
                'anonymousId' => $event->anonymous_id,
                'identifiedUserId' => $event->identified_user_id,
                'properties' => $event->properties,
                'occurredAt' => $event->occurred_at?->toIso8601String(),
            ])->values(),
            'previousPage' => $events->currentPage() > 1 ? $events->currentPage() - 1 : null,
            'nextPage' => $events->hasMorePages() ? $events->currentPage() + 1 : null,
        ]);
    }
}
