<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect(): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $user = User::updateOrCreate([
                'email' => $googleUser->getEmail(),
            ], [
                'name' => $googleUser->getName(),
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
            ]);

            if ($user->banned_at) {
                Inertia::flash('toast', ['type' => 'error', 'message' => 'Your account has been banned.']);

                return redirect()->route('login');
            }

            Auth::login($user);

            return redirect()->intended(config('fortify.home', '/dashboard'));
        } catch (Exception $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Google authentication failed.']);

            return redirect()->route('login');
        }
    }
}
