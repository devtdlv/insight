<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAnalyticsEventRequest;
use App\Models\Project;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;

class EventIngestionController extends Controller
{
    public function __invoke(StoreAnalyticsEventRequest $request): JsonResponse
    {
        $project = Project::query()
            ->where('write_key', $request->validated('write_key'))
            ->first();

        if (! $project instanceof Project) {
            return response()->json([
                'message' => 'The write key is not valid.',
            ], 401);
        }

        if ($project->isArchived()) {
            return response()->json([
                'message' => 'This write key is not accepting events.',
            ], 403);
        }

        $payload = $request->safe()->only([
            'name',
            'anonymous_id',
            'user_id',
            'properties',
            'occurred_at',
            'event_id',
        ]);

        $properties = $payload['properties'] ?? null;

        try {
            $project->analyticsEvents()->create([
                'name' => $payload['name'],
                'anonymous_id' => $payload['anonymous_id'],
                'identified_user_id' => $payload['user_id'] ?? null,
                'properties' => $properties === [] ? null : $properties,
                // Normalize to UTC: the datetime cast formats a parsed string in its own offset.
                'occurred_at' => CarbonImmutable::parse($payload['occurred_at'])->utc(),
                'received_at' => now(),
                'client_event_id' => $payload['event_id'] ?? null,
            ]);
        } catch (UniqueConstraintViolationException) {
            return response()->json([
                'status' => 'duplicate',
            ]);
        }

        return response()->json([
            'status' => 'accepted',
        ]);
    }
}
