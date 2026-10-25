<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;

class WorkspacePolicy
{
    public function view(User $user, Workspace $workspace): bool
    {
        return $workspace->roleFor($user) !== null;
    }

    public function update(User $user, Workspace $workspace): bool
    {
        return $workspace->roleFor($user)?->canManage() ?? false;
    }
}
