<?php

namespace App\Support;

final class Timezones
{
    /**
     * @return list<string>
     */
    public static function options(?string $current = null): array
    {
        $zones = [
            'UTC',
            'Pacific/Honolulu',
            'America/Anchorage',
            'America/Los_Angeles',
            'America/Denver',
            'America/Chicago',
            'America/New_York',
            'America/Sao_Paulo',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Europe/Helsinki',
            'Africa/Johannesburg',
            'Asia/Dubai',
            'Asia/Kolkata',
            'Asia/Singapore',
            'Asia/Tokyo',
            'Australia/Sydney',
            'Pacific/Auckland',
        ];

        if (is_string($current) && ! in_array($current, $zones, true) && in_array($current, timezone_identifiers_list(), true)) {
            $zones[] = $current;
        }

        return $zones;
    }
}
