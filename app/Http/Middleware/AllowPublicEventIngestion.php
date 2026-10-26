<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class AllowPublicEventIngestion
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS')) {
            return response()->noContent(204)->withHeaders($this->cors());
        }

        if (! $request->isJson()) {
            return $this->reject(415, 'Send a JSON request.');
        }

        if (strlen($request->getContent()) > (int) config('insight.ingestion_max_bytes')) {
            return $this->reject(413, 'The event payload is too large.');
        }

        $writeKey = (string) $request->input('write_key', '');
        $bucket = 'insight-events:'.hash('sha256', $writeKey.'|'.$request->ip());
        $limit = max(1, (int) config('insight.ingestion_per_minute'));

        if (RateLimiter::tooManyAttempts($bucket, $limit)) {
            return $this->reject(429, 'Too many events.')
                ->header('Retry-After', (string) RateLimiter::availableIn($bucket));
        }

        RateLimiter::hit($bucket, 60);

        $response = $next($request);

        foreach ($this->cors() as $name => $value) {
            $response->headers->set($name, $value);
        }

        return $response;
    }

    private function reject(int $status, string $message): JsonResponse
    {
        return response()->json(['message' => $message], $status)->withHeaders($this->cors());
    }

    /**
     * @return array<string, string>
     */
    private function cors(): array
    {
        return [
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Methods' => 'POST, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, Accept',
            'Access-Control-Max-Age' => '600',
        ];
    }
}
