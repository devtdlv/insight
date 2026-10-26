<?php

namespace App\Http\Requests;

use App\Rules\EventProperties;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Arr;

class StoreAnalyticsEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $payload = Arr::only($this->all(), [
            'write_key',
            'name',
            'anonymous_id',
            'user_id',
            'properties',
            'occurred_at',
            'event_id',
        ]);

        foreach (['user_id', 'event_id'] as $key) {
            if (array_key_exists($key, $payload) && is_string($payload[$key]) && trim($payload[$key]) === '') {
                $payload[$key] = null;
            }
        }

        if (array_key_exists('name', $payload) && is_string($payload['name'])) {
            $payload['name'] = trim($payload['name']);
        }

        $this->replace($payload);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $identifier = ['nullable', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'];

        return [
            'write_key' => ['required', 'string', 'regex:/^iw_[a-f0-9]{32}$/'],
            'name' => ['required', 'string', 'max:80', 'regex:/^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/'],
            'anonymous_id' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'user_id' => $identifier,
            'properties' => ['nullable', 'array', new EventProperties],
            'occurred_at' => [
                'required',
                'date',
                'after_or_equal:'.now()->subDays(30)->toIso8601String(),
                'before_or_equal:'.now()->addDay()->toIso8601String(),
            ],
            'event_id' => $identifier,
        ];
    }
}
