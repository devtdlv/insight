<?php

namespace App\Models;

use App\Enums\WorkspaceRole;
use Database\Factories\WorkspaceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workspace extends Model
{
    /** @use HasFactory<WorkspaceFactory> */
    use HasFactory;

    /** @var array<int, WorkspaceRole|null> */
    protected array $resolvedRoles = [];

    protected $fillable = [
        'name',
    ];

    public function memberships(): HasMany
    {
        return $this->hasMany(WorkspaceMembership::class);
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'workspace_memberships')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function roleFor(User $user): ?WorkspaceRole
    {
        if (! array_key_exists($user->id, $this->resolvedRoles)) {
            $role = $this->memberships()->where('user_id', $user->id)->first()?->role;
            $this->resolvedRoles[$user->id] = $role instanceof WorkspaceRole ? $role : null;
        }

        return $this->resolvedRoles[$user->id];
    }
}
