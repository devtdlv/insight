<?php

namespace App\Support;

use Illuminate\Http\Request;

class SafeRedirect
{
    /**
     * Return the session's intended URL when it stays on this application.
     */
    public static function intended(Request $request, string $fallback): string
    {
        $intended = $request->session()->pull('url.intended');

        if (! is_string($intended) || ! self::isSafe($intended, $request)) {
            return $fallback;
        }

        return $intended;
    }

    public static function isSafe(string $target, Request $request): bool
    {
        if ($target === '' || strpbrk($target, "\\\r\n\t") !== false) {
            return false;
        }

        if (str_starts_with($target, '/') && ! str_starts_with($target, '//')) {
            return true;
        }

        $parts = parse_url($target);

        if (! is_array($parts) || isset($parts['user']) || isset($parts['pass'])) {
            return false;
        }

        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;

        if (! in_array($scheme, ['http', 'https'], true) || ! is_string($host)) {
            return false;
        }

        return strcasecmp($host, $request->getHost()) === 0;
    }
}
