<?php

namespace App\Models;

use App\Support\WriteKey;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'name',
        'description',
        'website_url',
        'timezone',
        'archived_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Project $project): void {
            if (! is_string($project->write_key) || $project->write_key === '') {
                $project->write_key = WriteKey::generate();
            }
        });
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function analyticsEvents(): HasMany
    {
        return $this->hasMany(AnalyticsEvent::class);
    }

    public function rotateWriteKey(): void
    {
        $this->forceFill([
            'write_key' => WriteKey::generate(),
        ])->save();
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }
}
