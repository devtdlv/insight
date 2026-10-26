<?php

use App\Http\Controllers\Api\V1\EventIngestionController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Middleware\AllowPublicEventIngestion;
use Illuminate\Support\Facades\Route;

/*
| Public HTTP API. These routes stay outside the Inertia web middleware,
| so they return JSON and do not render React pages. They also stay outside
| the session CSRF middleware. Do not move ingestion onto the web group.
*/

Route::get('/health', HealthController::class)->name('api.health');

Route::match(['POST', 'OPTIONS'], '/events', EventIngestionController::class)
    ->middleware(AllowPublicEventIngestion::class)
    ->name('api.events.store');
