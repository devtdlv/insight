<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\PasswordResetLinkRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordResetLinkController extends Controller
{
    public const STATUS = 'If an account exists for that email, we sent password reset instructions.';

    public function create(): Response
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    /**
     * @throws ValidationException
     */
    public function store(PasswordResetLinkRequest $request): RedirectResponse
    {
        $key = 'password-reset|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'email' => __('Too many password reset attempts. Please wait and try again.'),
            ])->status(429);
        }

        RateLimiter::hit($key, 60);

        Password::sendResetLink($request->safe()->only('email'));

        return back()->with('status', self::STATUS);
    }
}
