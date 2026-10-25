<?php

use App\Models\User;
use App\Models\Workspace;

function tenancyUser(?User $user = null): User
{
    return $user ?? User::factory()->create();
}

function joinWorkspace(Workspace $workspace, string $role, ?User $user = null): User
{
    $user = tenancyUser($user);
    $workspace->memberships()->create([
        'user_id' => $user->id,
        'role' => $role,
    ]);

    return $user;
}
