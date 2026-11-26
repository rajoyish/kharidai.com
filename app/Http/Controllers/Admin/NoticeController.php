<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NoticeController extends Controller
{
    public function index(): Response
    {
        $notices = Notice::query()
            ->with('author:id,name')
            ->withCount('dismissedBy')
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Notice $notice): array => [
                'id' => $notice->id,
                'title' => $notice->title,
                'body' => $notice->body,
                'is_published' => $notice->published_at !== null,
                'published_at' => $notice->published_at?->toDayDateTimeString(),
                'author' => $notice->author?->name,
                'dismissed_count' => $notice->dismissed_by_count,
                'created_at' => $notice->created_at?->toFormattedDateString(),
            ]);

        return Inertia::render('Admin/Notices/Index', [
            'notices' => $notices,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateNotice($request);

        Notice::create([
            'user_id' => $request->user()->id,
            'title' => $validated['title'],
            'body' => $validated['body'],
            'published_at' => $validated['is_published'] ? now() : null,
        ]);

        return redirect()->back()->with('success', $validated['is_published'] ? 'Notice published.' : 'Notice saved as a draft.');
    }

    /**
     * Editing a published notice keeps its publish time, so the audience does
     * not change and anyone who already dismissed it is not shown it again.
     */
    public function update(Request $request, Notice $notice): RedirectResponse
    {
        $validated = $this->validateNotice($request);

        $notice->update([
            'title' => $validated['title'],
            'body' => $validated['body'],
            'published_at' => $validated['is_published'] ? ($notice->published_at ?? now()) : null,
        ]);

        return redirect()->back()->with('success', 'Notice updated.');
    }

    public function destroy(Notice $notice): RedirectResponse
    {
        $notice->delete();

        return redirect()->back()->with('success', 'Notice deleted.');
    }

    /**
     * @return array{title: string, body: string, is_published: bool}
     */
    private function validateNotice(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:5000'],
            'is_published' => ['required', 'boolean'],
        ]);
    }
}
