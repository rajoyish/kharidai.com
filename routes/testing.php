<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/*
 * Browser-test only.
 *
 * The application authenticates exclusively through Google OAuth, which cannot
 * be driven from a browser test. Playwright establishes its session by hitting
 * this route instead.
 *
 * This file is required from web.php only when the application boots in the
 * `testing` environment, so the route does not exist in local development or
 * in production. Keep it that way: it is an unauthenticated login backdoor.
 */
Route::get('_test/login-as-admin', function () {
    Auth::login(User::where('is_admin', true)->firstOrFail());

    return redirect()->route('admin.dashboard');
})->name('testing.login-as-admin');
