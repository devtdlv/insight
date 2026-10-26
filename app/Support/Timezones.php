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
            'America/Vancouver',
            'America/Phoenix',
            'America/Denver',
            'America/Chicago',
            'America/Mexico_City',
            'America/Bogota',
            'America/Lima',
            'America/New_York',
            'America/Toronto',
            'America/Santiago',
            'America/Sao_Paulo',
            'America/Argentina/Buenos_Aires',
            'Europe/London',
            'Europe/Madrid',
            'Europe/Paris',
            'Europe/Amsterdam',
            'Europe/Rome',
            'Europe/Berlin',
            'Europe/Stockholm',
            'Europe/Warsaw',
            'Europe/Helsinki',
            'Europe/Istanbul',
            'Europe/Moscow',
            'Africa/Lagos',
            'Africa/Cairo',
            'Africa/Johannesburg',
            'Africa/Nairobi',
            'Asia/Jerusalem',
            'Asia/Riyadh',
            'Asia/Dubai',
            'Asia/Karachi',
            'Asia/Kolkata',
            'Asia/Dhaka',
            'Asia/Bangkok',
            'Asia/Jakarta',
            'Asia/Singapore',
            'Asia/Manila',
            'Asia/Hong_Kong',
            'Asia/Shanghai',
            'Asia/Taipei',
            'Asia/Seoul',
            'Asia/Tokyo',
            'Australia/Perth',
            'Australia/Sydney',
            'Australia/Melbourne',
            'Pacific/Guam',
            'Pacific/Auckland',
        ];

        if (is_string($current) && ! in_array($current, $zones, true) && in_array($current, timezone_identifiers_list(), true)) {
            $zones[] = $current;
        }

        return $zones;
    }
}
