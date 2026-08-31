<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Exception;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class GoogleController extends Controller
{
    public function redirect(Request $request): SymfonyRedirectResponse
    {
        // The login modal opens over whatever page the visitor is on, so it
        // sends that page along and the callback returns them to it instead of
        // dumping them on the home page. Without it the intended URL already
        // stored by the auth middleware is left untouched.
        $intended = $this->sameOriginPath($request->query('redirect_to'));

        if ($intended !== null) {
            $request->session()->put('url.intended', $intended);
        }

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

    /**
     * Reduce a caller-supplied return target to a relative path on this site,
     * or null when it points anywhere else. Absolute and protocol-relative
     * values are rejected so the OAuth round trip cannot be used as an open
     * redirect.
     */
    private function sameOriginPath(mixed $target): ?string
    {
        if (! is_string($target) || $target === '' || strlen($target) > 2048) {
            return null;
        }

        if (! str_starts_with($target, '/')) {
            return null;
        }

        // "//evil.com" and "/\evil.com" are both read as protocol-relative
        // URLs by browsers even though they look like local paths.
        if (str_starts_with($target, '//') || str_starts_with($target, '/\\')) {
            return null;
        }

        return $target;
    }
}
