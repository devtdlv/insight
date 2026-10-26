<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Event ingestion
    |--------------------------------------------------------------------------
    |
    | Public write keys identify a project. They are not secrets. These limits
    | keep one browser client from sending an unbounded payload or an
    | unbounded number of events. The values are per PHP process cache, which
    | is the database cache in local development.
    |
    */

    'ingestion_per_minute' => (int) env('INSIGHT_INGESTION_PER_MINUTE', 60),

    'ingestion_max_bytes' => 16 * 1024,

    'ingestion_max_property_bytes' => 8 * 1024,

    'events_per_page' => 25,

];
