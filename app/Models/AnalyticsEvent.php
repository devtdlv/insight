<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalyticsEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'name',
        'anonymous_id',
        'identified_user_id',
        'properties',
        'occurred_at',
        'received_at',
        'client_event_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'properties' => 'array',
            'occurred_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn (): bool => false);
        static::deleting(fn (): bool => false);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
