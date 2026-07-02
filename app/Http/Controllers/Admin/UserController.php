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
        $userTable = (new User)->getTable();

        $users = User::query()
            ->select([
                "{$userTable}.id",
                "{$userTable}.name",
                "{$userTable}.email",
                "{$userTable}.mobile_number",
                "{$userTable}.is_admin",
                "{$userTable}.banned_at",
                "{$userTable}.created_at",
                "{$userTable}.last_active_at",
            ])
            ->latest()
            ->get()
            ->map(function (User $user): array {
                $createdAt = $user->created_at;
                $lastActiveAt = $user->last_active_at;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'mobile_number' => $user->mobile_number,
                    'is_admin' => $user->is_admin,
                    'banned_at' => $user->banned_at?->toIso8601String(),
                    'created_at' => $createdAt?->toIso8601String(),
                    'created_at_relative' => $createdAt?->diffForHumans(),
                    'created_at_absolute' => $createdAt?->format('n/j/Y'),
                    'last_active_at' => $lastActiveAt?->toIso8601String(),
                    'last_active_relative' => $lastActiveAt?->diffForHumans(),
                    'last_active_absolute' => $lastActiveAt?->format('n/j/Y'),
                ];
            });

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
        ]);
    }

    public function ban(User $user): RedirectResponse
    {
        if ($user->is(auth()->user())) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'You cannot ban yourself.']);

            return back();
        }

        $user->banned_at = $user->banned_at ? null : now();
        $user->save();

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
