<?php

it('renders the welcome page through inertia', function () {
    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('Welcome'));
});

it('sends guests from the dashboard to login', function () {
    $this->get('/dashboard')->assertRedirect(route('login'));
});

it('returns json for unknown api routes without a stack trace', function () {
    config(['app.debug' => false]);

    $response = $this->get('/api/v1/missing', [
        'Accept' => 'text/html',
    ]);

    $response->assertNotFound();

    expect($response->headers->get('content-type'))->toContain('application/json')
        ->and($response->json())->not->toHaveKey('trace')
        ->and($response->json())->not->toHaveKey('exception');
});

it('allows the configured frontend origin', function () {
    $response = $this->call('OPTIONS', '/api/v1/health', [], [], [], [
        'HTTP_ORIGIN' => 'http://localhost:5173',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
});

it('rejects an origin that is not configured', function () {
    $response = $this->call('OPTIONS', '/api/v1/health', [], [], [], [
        'HTTP_ORIGIN' => 'https://evil.example',
        'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
    ]);

    expect($response->headers->get('Access-Control-Allow-Origin'))
        ->not->toBe('https://evil.example')
        ->not->toBe('*');
});
