<?php

namespace App\Http\Controllers;

use App\Enums\WorkspaceRole;
use App\Models\Workspace;
use App\Support\Tenant;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceMemberController extends Controller
{
    public function index(Request $request, Workspace $workspace): Response
    {
        $role = Tenant::role($request, $workspace);
        $members = $workspace->memberships()->with('user:id,name')->get()->sortBy(
            fn ($membership) => sprintf(
                '%d-%s',
                match ($membership->role) {
                    WorkspaceRole::Owner => 0,
                    WorkspaceRole::Admin => 1,
                    WorkspaceRole::Member => 2,
                },
                mb_strtolower($membership->user->name),
            ),
        )->values();

        return Inertia::render('Workspaces/Members', [
            'workspace' => [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'role' => $role->value,
                'canManage' => $role->canManage(),
            ],
            'members' => $members->map(fn ($membership) => [
                'id' => $membership->id,
                'name' => $membership->user->name,
                'role' => $membership->role->value,
            ])->values(),
        ]);
    }
}
