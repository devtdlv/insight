<?php

namespace App\Support;

use App\Enums\WorkspaceRole;
use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Http\Request;

final class Tenant
{
    public static function user(Request $request): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 403);

        return $user;
    }

    public static function role(Request $request, Workspace $workspace): WorkspaceRole
    {
        $user = self::user($request);
        abort_unless($user->can('view', $workspace), 404);

        $role = $workspace->roleFor($user);
        abort_unless($role instanceof WorkspaceRole, 404);

        return $role;
    }

    public static function manage(Request $request, Workspace $workspace): WorkspaceRole
    {
        $role = self::role($request, $workspace);
        abort_unless($request->user()?->can('update', $workspace) === true, 403);

        return $role;
    }

    public static function manageProject(Request $request, Workspace $workspace, Project $project): WorkspaceRole
    {
        self::project($workspace, $project);
        $role = self::manage($request, $workspace);
        abort_unless($request->user()?->can('update', $project) === true, 403);

        return $role;
    }

    public static function project(Workspace $workspace, Project $project): Project
    {
        abort_unless($project->workspace_id === $workspace->id, 404);

        return $project;
    }
}
