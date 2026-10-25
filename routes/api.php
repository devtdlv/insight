<?php

use App\Http\Controllers\Api\V1\HealthController;
use Illuminate\Support\Facades\Route;

/*
| Public HTTP API. These routes stay outside the Inertia web middleware,
| so they return JSON and do not render React pages.
|
| Later milestones can add authenticated product routes and event ingestion
| in this file. Neither is implemented yet.
*/

Route::get('/health', HealthController::class)->name('api.health');
