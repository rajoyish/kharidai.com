<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Users/Index', [
            'users' => User::latest()->get(),
        ]);
    }

    public function ban(User $user): RedirectResponse
    {
        if ($user->is(auth()->user())) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'You cannot ban yourself.']);

            return back();
        }

        $user->update([
            'banned_at' => $user->banned_at ? null : now(),
        ]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'User status updated.']);

        return back();
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->is(auth()->user())) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'You cannot delete yourself.']);

            return back();
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'User deleted.']);

        return back();
    }
}
