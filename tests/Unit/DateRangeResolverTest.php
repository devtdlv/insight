<?php

use App\Support\Analytics\DateRange;
use App\Support\Analytics\DateRangeResolver;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

const RANGE_NOW = '2026-10-14 08:30:00';

beforeEach(function () {
    CarbonImmutable::setTestNow(CarbonImmutable::parse(RANGE_NOW, 'UTC'));
    Carbon::setTestNow(Carbon::parse(RANGE_NOW, 'UTC'));
});

afterEach(function () {
    CarbonImmutable::setTestNow();
    Carbon::setTestNow();
});

function rangeAt(string $timezone, ?string $range = null, ?string $from = null, ?string $to = null, string $now = RANGE_NOW): DateRange
{
    return (new DateRangeResolver)->resolve($timezone, $range, $from, $to, CarbonImmutable::parse($now, 'UTC'));
}

function utc(CarbonInterface $instant): string
{
    return $instant->format('Y-m-d H:i:s');
}

/** @return array{string, string} */
function window(array $window): array
{
    return [utc($window['start']), utc($window['end'])];
}

/** Structural guarantees every range must satisfy. */
function expectSoundRange(DateRange $range): void
{
    expect($range->startUtc->getTimezone()->getName())->toBe('UTC');
    expect($range->startUtc < $range->endUtc)->toBeTrue();
    expect($range->effectiveEndUtc > $range->startUtc && $range->effectiveEndUtc <= $range->endUtc)->toBeTrue();

    // Buckets cover [startUtc, effectiveEndUtc) contiguously, never the future.
    $buckets = $range->buckets;
    expect($buckets)->not->toBeEmpty();
    expect(utc($buckets[0]['start']))->toBe(utc($range->startUtc));
    expect(utc($buckets[array_key_last($buckets)]['end']))->toBe(utc($range->effectiveEndUtc));

    foreach ($buckets as $i => $bucket) {
        expect($bucket['start'] < $bucket['end'])->toBeTrue();

        if ($i > 0) {
            expect(utc($bucket['start']))->toBe(utc($buckets[$i - 1]['end']));
        }
    }

    expect(array_unique(array_column($buckets, 'key')))->toHaveCount(count($buckets));

    foreach ([$range->calendarComparison, $range->elapsedComparison] as $window) {
        expect($window['start'] < $window['end'])->toBeTrue();
        expect($window['end'] <= $range->startUtc)->toBeTrue();
    }

    expect($range->elapsedComparison['end'] <= $range->calendarComparison['end'])->toBeTrue();
    expect(utc($range->elapsedComparison['start']))->toBe(utc($range->calendarComparison['start']));
}

it('defaults to the 7d preset', function () {
    foreach ([null, ''] as $input) {
        $range = (new DateRangeResolver)->resolve('Asia/Manila', $input);

        expect($range->preset)->toBe('7d');
        expect($range->buckets)->toHaveCount(7);
    }
});

it('lists the supported presets', function () {
    expect(DateRangeResolver::presets())->toBe(['24h', '7d', '30d', '90d', 'custom']);
});

it('resolves 24h as a rolling window ending now', function () {
    $range = rangeAt('UTC', '24h');

    expect($range->preset)->toBe('24h');
    expect(utc($range->startUtc))->toBe('2026-10-13 08:30:00');
    expect(utc($range->endUtc))->toBe('2026-10-14 08:30:00');
    expect(utc($range->effectiveEndUtc))->toBe('2026-10-14 08:30:00');
    expect($range->inProgress())->toBeFalse();
    expect($range->isHourly())->toBeTrue();
    expect(window($range->calendarComparison))->toBe(['2026-10-12 08:30:00', '2026-10-13 08:30:00']);
    expect(window($range->elapsedComparison))->toBe(['2026-10-12 08:30:00', '2026-10-13 08:30:00']);
    expectSoundRange($range);
});

it('aligns 24h hourly buckets to local hours with partial edges', function () {
    $range = rangeAt('UTC', '24h');

    expect($range->buckets)->toHaveCount(25);
    expect($range->buckets[0]['partial'])->toBeTrue();
    expect($range->buckets[1]['partial'])->toBeFalse();
    expect($range->buckets[24]['partial'])->toBeTrue();
    expect($range->buckets[0]['key'])->toBe('2026-10-13T08:30:00Z');
    expect($range->buckets[1]['key'])->toBe('2026-10-13T09:00:00Z');
});

it('produces exactly 24 hourly buckets when now falls on the hour', function () {
    $range = rangeAt('UTC', '24h', now: '2026-10-14 08:00:00');

    expect($range->buckets)->toHaveCount(24);
    expect(array_column($range->buckets, 'partial'))->each->toBeFalse();
    expectSoundRange($range);
});

it('resolves 7d on local calendar dates for Asia/Manila', function () {
    $range = rangeAt('Asia/Manila', '7d');

    expect($range->localFrom)->toBe('2026-10-08');
    expect($range->localTo)->toBe('2026-10-14');
    expect(utc($range->startUtc))->toBe('2026-10-07 16:00:00');
    expect(utc($range->endUtc))->toBe('2026-10-14 16:00:00');
    expect(utc($range->effectiveEndUtc))->toBe(RANGE_NOW);
    expect($range->inProgress())->toBeTrue();
    expect($range->isHourly())->toBeFalse();
    expect($range->buckets)->toHaveCount(7);
    expect($range->buckets[0]['key'])->toBe('2026-10-07T16:00:00Z');
    expect($range->buckets[0]['label'])->toBe('Oct 8');
    expect($range->buckets[0]['localStart'])->toBe('2026-10-08T00:00:00+08:00');
    expect($range->buckets[0]['partial'])->toBeFalse();
    expect($range->buckets[6]['partial'])->toBeTrue();
    expectSoundRange($range);
});

it('gives in-progress presets a full calendar comparison and a fair elapsed comparison', function () {
    $range = rangeAt('Asia/Manila', '7d');

    expect(window($range->calendarComparison))->toBe(['2026-09-30 16:00:00', '2026-10-07 16:00:00']);
    expect(window($range->elapsedComparison))->toBe(['2026-09-30 16:00:00', '2026-10-07 08:30:00']);

    $currentSeconds = $range->effectiveEndUtc->getTimestamp() - $range->startUtc->getTimestamp();
    $previousSeconds = $range->elapsedComparison['end']->getTimestamp() - $range->elapsedComparison['start']->getTimestamp();
    expect($previousSeconds)->toBe($currentSeconds);
});

it('resolves 30d and 90d', function () {
    $thirty = rangeAt('Asia/Manila', '30d');
    expect($thirty->localFrom)->toBe('2026-09-15');
    expect($thirty->buckets)->toHaveCount(30);
    expect(utc($thirty->startUtc))->toBe('2026-09-14 16:00:00');
    expectSoundRange($thirty);

    $ninety = rangeAt('Asia/Manila', '90d');
    expect($ninety->localFrom)->toBe('2026-07-17');
    expect($ninety->buckets)->toHaveCount(90);
    expectSoundRange($ninety);
});

it('uses the local date for presets when the local day differs from UTC', function () {
    $range = rangeAt('Asia/Manila', '7d', now: '2026-10-14 20:00:00');

    expect($range->localTo)->toBe('2026-10-15');
    expect(utc($range->endUtc))->toBe('2026-10-15 16:00:00');
});

it('resolves a completed custom range with identical comparison windows', function () {
    $range = rangeAt('Asia/Manila', 'custom', '2026-10-01', '2026-10-03');

    expect(utc($range->startUtc))->toBe('2026-09-30 16:00:00');
    expect(utc($range->endUtc))->toBe('2026-10-03 16:00:00');
    expect(utc($range->effectiveEndUtc))->toBe(utc($range->endUtc));
    expect($range->inProgress())->toBeFalse();
    expect($range->isHourly())->toBeFalse();
    expect($range->buckets)->toHaveCount(3);
    expect(window($range->calendarComparison))->toBe(['2026-09-27 16:00:00', '2026-09-30 16:00:00']);
    expect(window($range->elapsedComparison))->toBe(window($range->calendarComparison));
    expectSoundRange($range);
});

it('uses hourly buckets for custom ranges of up to two dates', function () {
    $one = rangeAt('Asia/Manila', 'custom', '2026-10-10', '2026-10-10');
    expect($one->isHourly())->toBeTrue();
    expect($one->buckets)->toHaveCount(24);
    expectSoundRange($one);

    $two = rangeAt('Asia/Manila', 'custom', '2026-10-09', '2026-10-10');
    expect($two->buckets)->toHaveCount(48);
    expectSoundRange($two);

    $three = rangeAt('Asia/Manila', 'custom', '2026-10-08', '2026-10-10');
    expect($three->isHourly())->toBeFalse();
    expect($three->buckets)->toHaveCount(3);
});

it('compares a custom range that includes today by elapsed time', function () {
    $range = rangeAt('Asia/Manila', 'custom', '2026-10-13', '2026-10-14');

    expect($range->inProgress())->toBeTrue();
    // Buckets stop at the effective end (now): no future hours.
    expect($range->buckets)->toHaveCount(41);
    expect($range->buckets[0]['partial'])->toBeFalse();
    expect($range->buckets[39]['key'])->toBe('2026-10-14T07:00:00Z');
    expect($range->buckets[39]['partial'])->toBeFalse();
    expect($range->buckets[40]['key'])->toBe('2026-10-14T08:00:00Z');
    expect(utc($range->buckets[40]['end']))->toBe(RANGE_NOW);
    expect($range->buckets[40]['partial'])->toBeTrue();
    expect(window($range->calendarComparison))->toBe(['2026-10-10 16:00:00', '2026-10-12 16:00:00']);
    expect(window($range->elapsedComparison))->toBe(['2026-10-10 16:00:00', '2026-10-12 08:30:00']);
    expectSoundRange($range);
});

it('handles the America/Los_Angeles spring-forward day with 23 hourly buckets', function () {
    $range = rangeAt('America/Los_Angeles', 'custom', '2026-03-08', '2026-03-08', now: '2026-03-20 12:00:00');

    expect(utc($range->startUtc))->toBe('2026-03-08 08:00:00');
    expect(utc($range->endUtc))->toBe('2026-03-09 07:00:00');
    expect($range->buckets)->toHaveCount(23);

    $labels = array_column($range->buckets, 'label');
    expect($labels)->toContain('Mar 8, 1:00 AM PST');
    expect($labels)->toContain('Mar 8, 3:00 AM PDT');
    expect($labels)->not->toContain('Mar 8, 2:00 AM PST');
    expect($labels)->not->toContain('Mar 8, 2:00 AM PDT');
    expectSoundRange($range);
});

it('handles the America/Los_Angeles fall-back day with 25 unique hourly buckets', function () {
    $range = rangeAt('America/Los_Angeles', 'custom', '2026-11-01', '2026-11-01', now: '2026-11-10 12:00:00');

    expect(utc($range->startUtc))->toBe('2026-11-01 07:00:00');
    expect(utc($range->endUtc))->toBe('2026-11-02 08:00:00');
    expect($range->buckets)->toHaveCount(25);

    $labels = array_column($range->buckets, 'label');
    expect($labels)->toContain('Nov 1, 1:00 AM PDT');
    expect($labels)->toContain('Nov 1, 1:00 AM PST');

    $keys = array_column($range->buckets, 'key');
    expect($keys)->toContain('2026-11-01T08:00:00Z');
    expect($keys)->toContain('2026-11-01T09:00:00Z');
    expectSoundRange($range);
});

it('keeps DST days at their real length in daily buckets', function () {
    $spring = rangeAt('America/Los_Angeles', 'custom', '2026-03-07', '2026-03-09', now: '2026-03-20 12:00:00');
    $middle = $spring->buckets[1];
    expect($middle['end']->getTimestamp() - $middle['start']->getTimestamp())->toBe(23 * 3600);

    $fall = rangeAt('America/Los_Angeles', 'custom', '2026-10-31', '2026-11-02', now: '2026-11-10 12:00:00');
    $middle = $fall->buckets[1];
    expect($middle['end']->getTimestamp() - $middle['start']->getTimestamp())->toBe(25 * 3600);
});

it('uses calendar boundaries for presets that span a DST change', function () {
    $range = rangeAt('America/Los_Angeles', '7d', now: '2026-03-10 18:00:00');

    expect(utc($range->startUtc))->toBe('2026-03-04 08:00:00');
    expect(utc($range->endUtc))->toBe('2026-03-11 07:00:00');
    expect(window($range->calendarComparison))->toBe(['2026-02-25 08:00:00', '2026-03-04 08:00:00']);
    // 11:00 local on Mar 3 (PST) is 19:00Z, not a blind subtraction of elapsed seconds.
    expect(window($range->elapsedComparison))->toBe(['2026-02-25 08:00:00', '2026-03-03 19:00:00']);
    expectSoundRange($range);
});

it('aligns hourly buckets to local hours in Asia/Kathmandu (UTC+05:45)', function () {
    $range = rangeAt('Asia/Kathmandu', 'custom', '2026-10-10', '2026-10-10');

    expect(utc($range->startUtc))->toBe('2026-10-09 18:15:00');
    expect(utc($range->endUtc))->toBe('2026-10-10 18:15:00');
    expect($range->buckets)->toHaveCount(24);

    foreach ($range->buckets as $bucket) {
        expect($bucket['start']->minute)->toBe(15);
    }

    expectSoundRange($range);

    $rolling = rangeAt('Asia/Kathmandu', '24h');
    expect($rolling->buckets)->toHaveCount(25);
    expect(utc($rolling->buckets[0]['end']))->toBe('2026-10-13 09:15:00');

    foreach (array_slice($rolling->buckets, 1) as $bucket) {
        expect($bucket['start']->minute)->toBe(15);
    }

    expectSoundRange($rolling);
});

it('supports half-hour offsets in Asia/Kolkata', function () {
    $range = rangeAt('Asia/Kolkata', 'custom', '2026-10-10', '2026-10-10');

    expect(utc($range->startUtc))->toBe('2026-10-09 18:30:00');
    expect($range->buckets)->toHaveCount(24);
    expectSoundRange($range);
});

it('never overlaps the current and previous windows for any preset or zone', function () {
    $zones = ['UTC', 'Asia/Manila', 'America/Los_Angeles', 'Asia/Kathmandu', 'Pacific/Auckland', 'Australia/Lord_Howe'];
    $nows = ['2026-03-08 10:00:00', '2026-03-09 03:00:00', '2026-04-05 14:00:00', '2026-11-01 09:30:00', '2026-10-14 08:30:00'];

    foreach ($zones as $zone) {
        foreach ($nows as $now) {
            foreach (['24h', '7d', '30d', '90d'] as $preset) {
                expectSoundRange(rangeAt($zone, $preset, now: $now));
            }
        }
    }
});

it('accepts the maximum custom range of 90 dates', function () {
    $range = rangeAt('Asia/Manila', 'custom', '2026-07-17', '2026-10-14');

    expect($range->buckets)->toHaveCount(90);
    expect($range->isHourly())->toBeFalse();
    expectSoundRange($range);
});

it('has no lower date limit', function () {
    $range = rangeAt('UTC', 'custom', '2019-01-01', '2019-01-05');

    expect($range->buckets)->toHaveCount(5);
    expectSoundRange($range);
});

it('reports field errors for invalid input', function (?string $range, ?string $from, ?string $to, array $expectedFields) {
    $errors = (new DateRangeResolver)->validate('UTC', $range, $from, $to, CarbonImmutable::parse(RANGE_NOW, 'UTC'));

    expect(array_keys($errors))->toBe($expectedFields);
    expect(array_filter($errors, fn ($message) => $message === ''))->toBeEmpty();
})->with([
    'unknown preset' => ['14d', null, null, ['range']],
    'wrong case' => ['CUSTOM', '2026-10-01', '2026-10-02', ['range']],
    'padded preset' => [' 7d', null, null, ['range']],
    'custom without dates' => ['custom', null, null, ['from', 'to']],
    'custom with empty dates' => ['custom', '', '', ['from', 'to']],
    'missing end' => ['custom', '2026-10-01', null, ['to']],
    'missing start' => ['custom', null, '2026-10-01', ['from']],
    'short month' => ['custom', '2026-1-05', '2026-10-01', ['from']],
    'slashes' => ['custom', '10/01/2026', '2026-10-02', ['from']],
    'datetime string' => ['custom', '2026-10-01', '2026-10-02T00:00:00', ['to']],
    'impossible date' => ['custom', '2026-02-30', '2026-10-01', ['from']],
    'reversed' => ['custom', '2026-10-05', '2026-10-01', ['to']],
    'too long' => ['custom', '2026-07-16', '2026-10-14', ['to']],
    'end in the future' => ['custom', '2026-10-10', '2026-10-15', ['to']],
    'both in the future' => ['custom', '2026-10-15', '2026-10-16', ['from', 'to']],
]);

it('accepts valid input with no errors', function (?string $range, ?string $from, ?string $to) {
    $errors = (new DateRangeResolver)->validate('UTC', $range, $from, $to, CarbonImmutable::parse(RANGE_NOW, 'UTC'));

    expect($errors)->toBe([]);
})->with([
    'default' => [null, null, null],
    '24h' => ['24h', null, null],
    'preset ignores custom dates' => ['30d', 'garbage', 'garbage'],
    'today only' => ['custom', '2026-10-14', '2026-10-14'],
]);

it('judges future dates in the project timezone', function () {
    $now = CarbonImmutable::parse('2026-10-14 20:00:00', 'UTC');
    $resolver = new DateRangeResolver;

    expect($resolver->validate('Asia/Manila', 'custom', '2026-10-15', '2026-10-15', $now))->toBe([]);
    expect($resolver->validate('UTC', 'custom', '2026-10-15', '2026-10-15', $now))->toHaveKeys(['from', 'to']);
    expect($resolver->validate('America/Los_Angeles', 'custom', '2026-10-14', '2026-10-14', $now))->toBe([]);
});

it('throws when resolving invalid input', function () {
    (new DateRangeResolver)->resolve('UTC', 'custom', '2026-10-05', '2026-10-01', CarbonImmutable::parse(RANGE_NOW, 'UTC'));
})->throws(InvalidArgumentException::class, 'The end date must be on or after the start date.');

it('rejects unknown timezones', function () {
    (new DateRangeResolver)->resolve('Mars/Olympus', '7d');
})->throws(InvalidArgumentException::class, 'Unknown timezone');

it('uses the frozen clock when no instant is passed', function () {
    $range = (new DateRangeResolver)->resolve('UTC', '24h');

    expect(utc($range->endUtc))->toBe(RANGE_NOW);
});

it('aligns the elapsed comparison to local wall-clock time across spring-forward', function () {
    // Monday 10:00 PDT, a day after clocks moved forward.
    $range = rangeAt('America/Los_Angeles', '7d', now: '2026-03-09 17:00:00');

    expect($range->localFrom)->toBe('2026-03-03');
    expect(window($range->calendarComparison))->toBe(['2026-02-24 08:00:00', '2026-03-03 08:00:00']);
    // Previous Monday 10:00 PST = 18:00Z. Subtracting elapsed seconds would give 17:00Z (09:00 local).
    expect(window($range->elapsedComparison))->toBe(['2026-02-24 08:00:00', '2026-03-02 18:00:00']);
    expect($range->elapsedComparison['end']->setTimezone('America/Los_Angeles')->format('D H:i'))->toBe('Mon 10:00');
    expectSoundRange($range);
});

it('aligns the elapsed comparison to local wall-clock time across fall-back', function () {
    // Monday 10:00 PST, a day after clocks moved back.
    $range = rangeAt('America/Los_Angeles', '7d', now: '2026-11-02 18:00:00');

    expect(window($range->elapsedComparison))->toBe(['2026-10-20 07:00:00', '2026-10-26 17:00:00']);
    expect($range->elapsedComparison['end']->setTimezone('America/Los_Angeles')->format('D H:i'))->toBe('Mon 10:00');
    expectSoundRange($range);
});

it('moves a nonexistent comparison wall-clock time forward by the gap', function () {
    // Now is 02:30 PDT on Mar 15. Seven dates earlier, 02:30 on Mar 8 never existed.
    $range = rangeAt('America/Los_Angeles', '7d', now: '2026-03-15 09:30:00');

    expect(utc($range->elapsedComparison['end']))->toBe('2026-03-08 10:30:00');
    expect($range->elapsedComparison['end']->setTimezone('America/Los_Angeles')->format('H:i'))->toBe('03:30');
    expectSoundRange($range);
});

it('uses the first occurrence of an ambiguous comparison wall-clock time', function () {
    // Now is 01:30 PST on Nov 8. Seven dates earlier, 01:30 on Nov 1 happened twice.
    $range = rangeAt('America/Los_Angeles', '7d', now: '2026-11-08 09:30:00');

    expect(utc($range->elapsedComparison['end']))->toBe('2026-11-01 08:30:00');
    expect($range->elapsedComparison['end']->setTimezone('America/Los_Angeles')->format('T'))->toBe('PDT');
    expectSoundRange($range);
});

it('keeps the full comparison for a completed custom range across DST', function () {
    $range = rangeAt('America/Los_Angeles', 'custom', '2026-03-09', '2026-03-11', now: '2026-03-20 12:00:00');

    expect($range->inProgress())->toBeFalse();
    expect(window($range->calendarComparison))->toBe(['2026-03-06 08:00:00', '2026-03-09 07:00:00']);
    expect(window($range->elapsedComparison))->toBe(window($range->calendarComparison));
    expectSoundRange($range);
});

it('returns an empty comparison window when now is exactly the range start', function () {
    $range = rangeAt('Asia/Manila', 'custom', '2026-10-14', '2026-10-14', now: '2026-10-13 16:00:00');

    expect(utc($range->effectiveEndUtc))->toBe(utc($range->startUtc));
    expect($range->buckets)->toBe([]);
    expect(window($range->elapsedComparison))->toBe(['2026-10-12 16:00:00', '2026-10-12 16:00:00']);
});

it('exposes the effective end as min(end, now)', function () {
    $including = rangeAt('Asia/Manila', 'custom', '2026-10-12', '2026-10-14');
    expect(utc($including->effectiveEndUtc))->toBe(RANGE_NOW);
    expect($including->effectiveEndUtc < $including->endUtc)->toBeTrue();
    expect($including->inProgress())->toBeTrue();

    $ended = rangeAt('Asia/Manila', 'custom', '2026-10-10', '2026-10-12');
    expect(utc($ended->effectiveEndUtc))->toBe(utc($ended->endUtc));
    expect($ended->inProgress())->toBeFalse();

    expect(utc(rangeAt('UTC', '24h')->effectiveEndUtc))->toBe(RANGE_NOW);
});

it('never creates buckets beyond the effective end', function () {
    $daily = rangeAt('Asia/Manila', '7d');
    expect(utc($daily->buckets[6]['end']))->toBe(RANGE_NOW);
    expect($daily->buckets[6]['partial'])->toBeTrue();

    // Now falls inside the repeated 01:xx PST hour on the fall-back day.
    $hourly = rangeAt('America/Los_Angeles', 'custom', '2026-11-01', '2026-11-01', now: '2026-11-01 09:30:00');
    expect($hourly->buckets)->toHaveCount(3);
    expect(utc($hourly->buckets[2]['start']))->toBe('2026-11-01 09:00:00');
    expect(utc($hourly->buckets[2]['end']))->toBe('2026-11-01 09:30:00');
    expect($hourly->buckets[2]['partial'])->toBeTrue();
    expect($hourly->buckets[1]['partial'])->toBeFalse();
    expectSoundRange($hourly);
});

it('buckets Australia/Lord_Howe on its 30-minute spring-forward day', function () {
    // 2026-10-04: 02:00 +10:30 jumps to 02:30 +11:00. The day lasts 23.5 hours.
    $range = rangeAt('Australia/Lord_Howe', 'custom', '2026-10-04', '2026-10-04', now: '2026-10-20 12:00:00');

    expect(utc($range->startUtc))->toBe('2026-10-03 13:30:00');
    expect(utc($range->endUtc))->toBe('2026-10-04 13:00:00');
    expect($range->buckets)->toHaveCount(23);

    // 01:00 to 03:00 local is one bucket of 90 real minutes because 02:00 never occurs.
    expect($range->buckets[1]['localStart'])->toBe('2026-10-04T01:00:00+10:30');
    expect($range->buckets[1]['end']->getTimestamp() - $range->buckets[1]['start']->getTimestamp())->toBe(5400);
    expect($range->buckets[2]['localStart'])->toBe('2026-10-04T03:00:00+11:00');

    foreach ($range->buckets as $bucket) {
        expect($bucket['partial'])->toBeFalse();
        expect($bucket['start']->setTimezone('Australia/Lord_Howe')->minute)->toBe(0);
    }

    expectSoundRange($range);
});

it('buckets Australia/Lord_Howe on its 30-minute fall-back day', function () {
    // 2026-04-05: 02:00 +11:00 falls back to 01:30 +10:30. The day lasts 24.5 hours.
    $range = rangeAt('Australia/Lord_Howe', 'custom', '2026-04-05', '2026-04-05', now: '2026-04-20 12:00:00');

    expect(utc($range->startUtc))->toBe('2026-04-04 13:00:00');
    expect(utc($range->endUtc))->toBe('2026-04-05 13:30:00');
    expect($range->buckets)->toHaveCount(24);

    // 01:00 +11:00 to 02:00 +10:30 covers the repeated half hour: 90 real minutes.
    expect(utc($range->buckets[1]['start']))->toBe('2026-04-04 14:00:00');
    expect($range->buckets[1]['end']->getTimestamp() - $range->buckets[1]['start']->getTimestamp())->toBe(5400);
    expectSoundRange($range);
});

it('gives Australia/Lord_Howe daily buckets their real DST lengths', function () {
    $spring = rangeAt('Australia/Lord_Howe', 'custom', '2026-10-03', '2026-10-05', now: '2026-10-20 12:00:00');
    expect($spring->buckets[1]['end']->getTimestamp() - $spring->buckets[1]['start']->getTimestamp())->toBe(84600);

    $fall = rangeAt('Australia/Lord_Howe', 'custom', '2026-04-04', '2026-04-06', now: '2026-04-20 12:00:00');
    expect($fall->buckets[1]['end']->getTimestamp() - $fall->buckets[1]['start']->getTimestamp())->toBe(88200);
});

it('handles a midnight spring-forward in America/Sao_Paulo (2018-11-04)', function () {
    // Local 00:00 did not exist: the day starts at 01:00 -02:00 and lasts 23 hours.
    $range = rangeAt('America/Sao_Paulo', 'custom', '2018-11-04', '2018-11-04', now: '2018-11-20 12:00:00');

    expect(utc($range->startUtc))->toBe('2018-11-04 03:00:00');
    expect(utc($range->endUtc))->toBe('2018-11-05 02:00:00');
    expect($range->buckets)->toHaveCount(23);
    expect($range->buckets[0]['localStart'])->toBe('2018-11-04T01:00:00-02:00');
    expect($range->buckets[0]['partial'])->toBeFalse();
    expectSoundRange($range);

    $daily = rangeAt('America/Sao_Paulo', 'custom', '2018-11-03', '2018-11-05', now: '2018-11-20 12:00:00');
    expect($daily->buckets[1]['end']->getTimestamp() - $daily->buckets[1]['start']->getTimestamp())->toBe(23 * 3600);
    expectSoundRange($daily);
});

it('handles a midnight fall-back in America/Sao_Paulo (2018-02-17)', function () {
    // 00:00 -02:00 on Feb 18 became 23:00 -03:00 on Feb 17, so 23:00 occurs twice.
    $range = rangeAt('America/Sao_Paulo', 'custom', '2018-02-17', '2018-02-17', now: '2018-03-01 12:00:00');

    expect(utc($range->startUtc))->toBe('2018-02-17 02:00:00');
    expect(utc($range->endUtc))->toBe('2018-02-18 03:00:00');
    expect($range->buckets)->toHaveCount(25);

    $elevenPm = array_filter($range->buckets, fn ($bucket) => str_starts_with($bucket['localStart'], '2018-02-17T23:00:00'));
    expect($elevenPm)->toHaveCount(2);
    expectSoundRange($range);
});
