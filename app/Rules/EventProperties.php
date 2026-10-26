<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class EventProperties implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value)) {
            $fail('The properties must be an object.');

            return;
        }

        if ($value === []) {
            return;
        }

        if (array_is_list($value)) {
            $fail('The properties must be an object.');

            return;
        }

        $encoded = json_encode($value);

        if ($encoded === false || strlen($encoded) > (int) config('insight.ingestion_max_property_bytes')) {
            $fail('The properties are too large.');

            return;
        }

        if (! $this->allowed($value, 0)) {
            $fail('The properties contain an unsupported value.');
        }
    }

    private function allowed(mixed $value, int $depth): bool
    {
        if ($depth > 4) {
            return false;
        }

        if (! is_array($value)) {
            if (is_string($value)) {
                return strlen($value) <= 500;
            }

            return is_int($value) || is_float($value) || is_bool($value) || $value === null;
        }

        if (count($value) > 40) {
            return false;
        }

        if (array_is_list($value)) {
            foreach ($value as $item) {
                if (is_array($item) || ! $this->allowed($item, $depth + 1)) {
                    return false;
                }
            }

            return true;
        }

        foreach ($value as $key => $item) {
            if (! is_string($key) || strlen($key) > 40 || preg_match('/^[A-Za-z0-9_.:-]+$/', $key) !== 1) {
                return false;
            }

            if (! $this->allowed($item, $depth + 1)) {
                return false;
            }
        }

        return true;
    }
}
