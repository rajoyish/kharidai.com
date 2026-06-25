<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json([
            'notifications' => $request->user()->notifications()->take(20)->get(),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->notifications()->delete();

        return response()->json(['success' => true]);
    }
}
