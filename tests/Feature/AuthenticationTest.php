<?php

use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

function authPassword(): string
{
    return 'Correct-password-1';
}

it('registers a user and starts a session', function () {
    $this->post('/register', [
        'name' => 'Ada Lovelace',
        'email' => 'Ada@Example.com',
        'password' => authPassword(),
        'password_confirmation' => authPassword(),
    ])->assertRedirect(route('dashboard'));

    $user = User::query()->where('email', 'ada@example.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->name)->toBe('Ada Lovelace')
        ->and($user->password)->not->toBe(authPassword())
        ->and(Hash::check(authPassword(), $user->password))->toBeTrue();

    $this->assertAuthenticatedAs($user);
});

it('rejects invalid registration input', function () {
    User::factory()->create(['email' => 'ada@example.com']);

    $response = $this->from('/register')->post('/register', [
        'name' => '',
        'email' => 'not-an-email',
        'password' => 'short',
        'password_confirmation' => 'different',
    ]);

    $response->assertRedirect('/register')
        ->assertSessionHasErrors(['name', 'email', 'password']);

    expect($response->getContent())->not->toContain('short');
    $this->assertGuest();
});

it('rejects a duplicate registration email', function () {
    User::factory()->create(['email' => 'ada@example.com']);

    $this->from('/register')->post('/register', [
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'password' => authPassword(),
        'password_confirmation' => authPassword(),
    ])->assertRedirect('/register')
        ->assertSessionHasErrors('email');

    expect(User::query()->count())->toBe(1);
    $this->assertGuest();
});

it('logs in with email and password and regenerates the session', function () {
    $user = User::factory()->create([
        'email' => 'ada@example.com',
        'password' => authPassword(),
    ]);

    $this->get('/login');
    $previous = session()->getId();

    $this->post('/login', [
        'email' => 'Ada@Example.com',
        'password' => authPassword(),
    ])->assertRedirect(route('dashboard'));

    expect(session()->getId())->not->toBe($previous);
    $this->assertAuthenticatedAs($user);
});

it('rejects unknown credentials without revealing which field failed', function () {
    User::factory()->create([
        'email' => 'ada@example.com',
        'password' => authPassword(),
    ]);

    $known = $this->from('/login')->post('/login', [
        'email' => 'ada@example.com',
        'password' => 'Wrong-password-1',
    ]);

    $unknown = $this->from('/login')->post('/login', [
        'email' => 'missing@example.com',
        'password' => authPassword(),
    ]);

    $known->assertRedirect('/login')->assertSessionHasErrors('email');
    $unknown->assertRedirect('/login')->assertSessionHasErrors('email');

    expect(session('errors')->getBag('default')->first('email'))
        ->toBe(trans('auth.failed'));

    $this->assertGuest();
});

it('rate limits repeated login attempts', function () {
    User::factory()->create([
        'email' => 'limited@example.com',
        'password' => authPassword(),
    ]);

    foreach (range(1, 5) as $attempt) {
        $this->from('/login')->post('/login', [
            'email' => 'limited@example.com',
            'password' => 'Wrong-password-1',
        ])->assertRedirect('/login');
    }

    $this->from('/login')->post('/login', [
        'email' => 'limited@example.com',
        'password' => authPassword(),
    ])->assertRedirect('/login')
        ->assertSessionHasErrors('email');

    expect(session('errors')->getBag('default')->first('email'))
        ->toContain('Too many login attempts');

    $this->assertGuest();
});

it('logs out and replaces the csrf token', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/dashboard');
    $token = csrf_token();

    $this->post('/logout')
        ->assertRedirect(route('home'));

    expect(csrf_token())->not->toBe($token);
    $this->assertGuest();
    $this->get('/logout')->assertMethodNotAllowed();
});

it('sends guests to login and returns them to the dashboard', function () {
    $user = User::factory()->create([
        'email' => 'ada@example.com',
        'password' => authPassword(),
    ]);

    $this->get('/dashboard')->assertRedirect(route('login'));

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => authPassword(),
    ]);

    $response->assertRedirect();
    expect(parse_url((string) $response->headers->get('Location'), PHP_URL_PATH))->toBe('/dashboard');
    $this->assertAuthenticatedAs($user);
});

it('ignores an off-site address stored as the intended url', function () {
    $user = User::factory()->create([
        'email' => 'ada@example.com',
        'password' => authPassword(),
    ]);

    $this->get('/login');
    session(['url.intended' => 'https://evil.example/phish']);

    $this->post('/login', [
        'email' => $user->email,
        'password' => authPassword(),
    ])->assertRedirect(route('dashboard'));
});

it('redirects authenticated users away from guest pages', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/login')->assertRedirect(route('dashboard'));
    $this->actingAs($user)->get('/register')->assertRedirect(route('dashboard'));
    $this->actingAs($user)->get('/forgot-password')->assertRedirect(route('dashboard'));
});

it('shows the dashboard to an authenticated user without auth secrets', function () {
    $user = User::factory()->create(['name' => 'Ada Lovelace']);

    $this->actingAs($user)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('auth.user.name', 'Ada Lovelace')
            ->missing('auth.user.password')
            ->missing('auth.user.email')
            ->missing('auth.user.remember_token'));
});

it('sends a password reset link without revealing whether the account exists', function () {
    Notification::fake();

    $user = User::factory()->create(['email' => 'ada@example.com']);

    $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'ada@example.com',
    ])->assertRedirect('/forgot-password')
        ->assertSessionHas('status', PasswordResetLinkController::STATUS);

    $this->from('/forgot-password')->post('/forgot-password', [
        'email' => 'missing@example.com',
    ])->assertRedirect('/forgot-password')
        ->assertSessionHas('status', PasswordResetLinkController::STATUS);

    Notification::assertSentToTimes($user, ResetPassword::class, 1);
    Notification::assertCount(1);
});

it('resets a password with a valid token', function () {
    Notification::fake();

    $user = User::factory()->create([
        'email' => 'ada@example.com',
        'password' => authPassword(),
    ]);

    $this->post('/forgot-password', ['email' => $user->email]);

    $token = null;

    Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
        $token = $notification->token;

        return true;
    });

    $this->get('/login');
    $previous = session()->getId();

    $this->post('/reset-password', [
        'token' => $token,
        'email' => $user->email,
        'password' => 'Replacement-22',
        'password_confirmation' => 'Replacement-22',
    ])->assertRedirect(route('dashboard'));

    $user->refresh();

    expect(Hash::check('Replacement-22', $user->password))->toBeTrue()
        ->and(Hash::check(authPassword(), $user->password))->toBeFalse()
        ->and(session()->getId())->not->toBe($previous);

    $this->assertAuthenticatedAs($user);
});

it('rejects an invalid password reset token', function () {
    $user = User::factory()->create([
        'email' => 'ada@example.com',
        'password' => authPassword(),
    ]);

    $this->from('/reset-password/bad-token')->post('/reset-password', [
        'token' => 'bad-token',
        'email' => $user->email,
        'password' => 'Replacement-22',
        'password_confirmation' => 'Replacement-22',
    ])->assertRedirect('/reset-password/bad-token')
        ->assertSessionHasErrors('email');

    $user->refresh();

    expect(Hash::check(authPassword(), $user->password))->toBeTrue();
    $this->assertGuest();
});

it('renders the password reset form for a token', function () {
    $this->get('/reset-password/reset-token?email=ada@example.com')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Auth/ResetPassword')
            ->where('token', 'reset-token')
            ->where('email', 'ada@example.com'));
});
