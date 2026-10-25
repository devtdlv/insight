<?php

it('keeps the automated suite on sqlite memory instead of MariaDB', function () {
    expect(config('database.default'))->toBe('sqlite')
        ->and(config('database.connections.sqlite.database'))->toBe(':memory:')
        ->and(config('database.connections.sqlite.database'))->not->toBe('inspect');
});

it('documents mysql, port 3306, and the insight database for local development', function () {
    $example = (string) file_get_contents(base_path('.env.example'));

    expect($example)->toContain('DB_CONNECTION=mysql')
        ->and($example)->toContain('DB_HOST=127.0.0.1')
        ->and($example)->toContain('DB_PORT=3306')
        ->and($example)->toContain('DB_DATABASE=insight')
        ->and($example)->toContain('CACHE_STORE=database')
        ->and($example)->toContain('SESSION_DRIVER=database')
        ->and($example)->toContain('QUEUE_CONNECTION=database')
        ->and($example)->not->toContain('DB_DATABASE=inspect')
        ->and($example)->not->toContain('DB_CONNECTION=pgsql')
        ->and($example)->not->toContain('CACHE_STORE=redis')
        ->and($example)->not->toContain('QUEUE_CONNECTION=redis');
});

it('defaults the application to the mysql driver and database-backed services', function () {
    $database = (string) file_get_contents(config_path('database.php'));
    $cache = (string) file_get_contents(config_path('cache.php'));
    $queue = (string) file_get_contents(config_path('queue.php'));

    expect($database)->toContain("env('DB_CONNECTION', 'mysql')")
        ->and($database)->toContain("'driver' => 'mysql'")
        ->and($database)->toContain("env('DB_DATABASE', 'insight')")
        ->and($database)->not->toContain("'inspect'")
        ->and($cache)->toContain("env('CACHE_STORE', 'database')")
        ->and($queue)->toContain("env('QUEUE_CONNECTION', 'database')");
});

it('includes migrations for sessions, cache, and queues', function () {
    $migrations = collect(glob(database_path('migrations/*.php')))
        ->map(fn (string $path): string => (string) file_get_contents($path))
        ->implode("\n");

    expect($migrations)->toContain("Schema::create('sessions'")
        ->and($migrations)->toContain("Schema::create('cache'")
        ->and($migrations)->toContain("Schema::create('cache_locks'")
        ->and($migrations)->toContain("Schema::create('jobs'")
        ->and($migrations)->toContain("Schema::create('job_batches'")
        ->and($migrations)->toContain("Schema::create('failed_jobs'");
});
