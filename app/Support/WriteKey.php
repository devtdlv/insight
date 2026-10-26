<?php

namespace App\Support;

final class WriteKey
{
    public static function generate(): string
    {
        return 'iw_'.bin2hex(random_bytes(16));
    }
}
