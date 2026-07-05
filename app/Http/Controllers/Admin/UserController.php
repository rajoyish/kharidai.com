<?php

namespace App\Http\Controllers\Admin;

use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    use PasswordValidationRules;

    public function create(): Response
    {
        return Inertia::render('Admin/Users/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'mobile_number' => ['nullable', 'string', 'max:30'],
            'password' => $this->passwordRules(),
            'is_admin' => ['nullable', 'boolean'],
        ]);

        $user = new User;
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->mobile_number = $validated['mobile_number'] ?? null;
        $user->password = $validated['password']; // hashed by the model cast
        $user->is_admin = $validated['is_admin'] ?? false;
        $user->email_verified_at = now();
        $user->save();

        return redirect()->route('admin.users.index')->with('success', 'User created successfully.');
    }

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
