<?php

it('returns the public health contract', function () {
    $response = $this->getJson('/api/v1/health');

    $response->assertOk()
        ->assertExactJson([
            'status' => 'ok',
            'service' => 'insight-api',
        ]);

    $body = (string) $response->getContent();

    expect($body)->not->toContain('APP_KEY')
        ->and($body)->not->toContain('postgres')
        ->and($body)->not->toContain('redis')
        ->and($body)->not->toContain('inspect')
        ->and($body)->not->toContain('trace');
});

it('returns json for the health endpoint when the client accepts html', function () {
    $response = $this->get('/api/v1/health', [
        'Accept' => 'text/html',
    ]);

    $response->assertOk()
        ->assertExactJson([
            'status' => 'ok',
            'service' => 'insight-api',
        ]);

    expect($response->headers->get('content-type'))->toContain('application/json')
        ->and($response->headers->get('location'))->toBeNull();
});
