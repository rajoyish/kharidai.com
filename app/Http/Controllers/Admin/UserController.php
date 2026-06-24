<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\User;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        return Inertia::render('Admin/Users/Index', [
            'users' => User::latest()->get()
        ]);
    }

    public function ban(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'You cannot ban yourself.');
        }

        $user->update([
            'banned_at' => $user->banned_at ? null : now(),
        ]);

        return back()->with('success', 'User status updated.');
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'You cannot delete yourself.');
        }

        $user->delete();

        return back()->with('success', 'User deleted.');
    }
}
