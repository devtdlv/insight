<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;
use App\Models\Workspace;

class ProjectPolicy
{
    public function view(User $user, Project $project): bool
    {
        return $project->workspace->roleFor($user) !== null;
    }

    public function create(User $user, Workspace $workspace): bool
    {
        return $workspace->roleFor($user)?->canManage() ?? false;
    }

    public function update(User $user, Project $project): bool
    {
        return $project->workspace->roleFor($user)?->canManage() ?? false;
    }
}
