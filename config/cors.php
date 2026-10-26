<?php

$origins = array_values(array_filter(array_map(
    static fn (string $origin): string => trim($origin),
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')),
)));

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Browser calls to the health check are allowed only for the origins listed
    | in CORS_ALLOWED_ORIGINS. Event ingestion uses its own middleware and
    | allows any browser origin, because a public write key is not a secret.
    | Do not set this list to a wildcard.
    |
    */

    'paths' => ['api/v1/health'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => $origins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 600,

    'supports_credentials' => false,

];
