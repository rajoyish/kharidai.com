<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NoticeController extends Controller
{
    /**
     * Every notice the user was sent, dismissed or not, newest first.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $dismissedIds = $user->dismissedNotices()->pluck('notices.id')->flip();

        $notices = Notice::query()
            ->visibleTo($user)
            ->latest('published_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Notice $notice): array => [
                'id' => $notice->id,
                'title' => $notice->title,
                'body' => $notice->body,
                'published_at' => $notice->published_at?->toFormattedDateString(),
                'is_dismissed' => $dismissedIds->has($notice->id),
            ]);

        return Inertia::render('User/Notices/Index', [
            'notices' => $notices,
        ]);
    }

    public function dismiss(Request $request, Notice $notice): RedirectResponse
    {
        abort_unless($notice->isVisibleTo($request->user()), 404);

        $request->user()->dismissedNotices()->syncWithoutDetaching([$notice->id]);

        return redirect()->back();
    }
}
