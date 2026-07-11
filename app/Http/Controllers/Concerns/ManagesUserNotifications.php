<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Shared behaviour for the authenticated user's notification management page.
 * Admin and User panels reuse identical scoping and bulk actions, differing
 * only in the Inertia page they render.
 */
trait ManagesUserNotifications
{
    /**
     * The Inertia page component that renders the notification timeline.
     */
    abstract protected function notificationsComponent(): string;

    public function index(Request $request): Response
    {
        $notifications = $request->user()
            ->notifications()
            ->paginate(15)
            ->through(fn (DatabaseNotification $notification): array => [
                'id' => $notification->id,
                'type' => class_basename($notification->type),
                'data' => $notification->data,
                'read_at' => $notification->read_at?->toIso8601String(),
                'created_at' => $notification->created_at->toIso8601String(),
            ]);

        return Inertia::render($this->notificationsComponent(), [
            'notifications' => $notifications,
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'All notifications marked as read.',
        ]);

        return back();
    }

    public function destroyAll(Request $request): RedirectResponse
    {
        $request->user()->notifications()->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'All notifications deleted.',
        ]);

        return back();
    }
}
