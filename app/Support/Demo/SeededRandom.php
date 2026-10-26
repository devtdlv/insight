<?php

namespace App\Support\Demo;

/**
 * Small deterministic generator (mulberry32). It does not touch PHP's global
 * random state, so the same seed always gives the same sequence.
 */
final class SeededRandom
{
    private const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    private int $state;

    public function __construct(int $seed)
    {
        $this->state = $seed & 0xFFFFFFFF;
    }

    /**
     * A float in [0, 1).
     */
    public function float(): float
    {
        $this->state = ($this->state + 0x6D2B79F5) & 0xFFFFFFFF;
        $t = $this->state;
        $t = $this->imul($t ^ ($t >> 15), $t | 1);
        $t = ($t ^ ($t + $this->imul($t ^ ($t >> 7), $t | 61))) & 0xFFFFFFFF;

        return (($t ^ ($t >> 14)) & 0xFFFFFFFF) / 4294967296;
    }

    /**
     * An integer in [min, max], both included.
     */
    public function int(int $min, int $max): int
    {
        return $min + (int) floor($this->float() * ($max - $min + 1));
    }

    public function chance(float $probability): bool
    {
        return $this->float() < $probability;
    }

    /**
     * @template T
     *
     * @param  list<T>  $items
     * @return T
     */
    public function pick(array $items): mixed
    {
        return $items[$this->int(0, count($items) - 1)];
    }

    /**
     * Picks a key with probability proportional to its weight. Keys with a
     * weight of zero or less are never picked.
     *
     * @param  array<int|string, float|int>  $weights
     */
    public function weighted(array $weights): int|string
    {
        $total = 0.0;

        foreach ($weights as $weight) {
            $total += max(0.0, (float) $weight);
        }

        $target = $this->float() * $total;
        $last = null;

        foreach ($weights as $key => $weight) {
            if ($weight <= 0) {
                continue;
            }

            $last = $key;
            $target -= $weight;

            if ($target < 0) {
                return $key;
            }
        }

        return $last ?? array_key_first($weights);
    }

    /**
     * A standard normal sample (Box-Muller).
     */
    public function normal(): float
    {
        $u = max($this->float(), 1.0e-12);

        return sqrt(-2.0 * log($u)) * cos(2.0 * M_PI * $this->float());
    }

    /**
     * A mixed-case alphanumeric string.
     */
    public function token(int $length): string
    {
        $token = '';

        for ($i = 0; $i < $length; $i++) {
            $token .= self::ALPHABET[$this->int(0, strlen(self::ALPHABET) - 1)];
        }

        return $token;
    }

    private function imul(int $a, int $b): int
    {
        $a &= 0xFFFFFFFF;
        $b &= 0xFFFFFFFF;

        return (($a & 0xFFFF) * $b + (((($a >> 16) * $b) & 0xFFFF) << 16)) & 0xFFFFFFFF;
    }
}
