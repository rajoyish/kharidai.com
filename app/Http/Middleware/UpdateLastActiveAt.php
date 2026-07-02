<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class UpdateLastActiveAt
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()) {
            $user = $request->user();

            if (! $user->last_active_at || $user->last_active_at->diffInMinutes(now()) >= 5) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['last_active_at' => now()]);
            }
        }

        return $next($request);
    }
}
