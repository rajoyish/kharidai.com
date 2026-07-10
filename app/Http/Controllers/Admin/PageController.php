<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\HandlesHeroImage;
use App\Http\Controllers\Concerns\NormalizesPublishDate;
use App\Http\Controllers\Controller;
use App\Models\Page;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    use HandlesHeroImage;
    use NormalizesPublishDate;

    public function index(): Response
    {
        $pages = Page::query()->ordered()->get()->map(fn (Page $page): array => [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'image' => $page->image ? asset('storage/'.$page->image) : null,
            'is_published' => $page->is_published,
            'published_at' => $page->published_at?->toDateString(),
            'sort_order' => $page->sort_order,
            'show_in_nav' => $page->show_in_nav,
            'show_in_footer' => $page->show_in_footer,
        ]);

        return Inertia::render('Admin/Pages/Index', ['pages' => $pages]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Pages/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePage($request);
        $validated['image'] = $this->storeHeroImage($request, 'pages', null, $validated['title'] ?? null);
        $validated['is_published'] = $request->boolean('is_published');
        $validated['published_at'] = $this->normalizePublishDate($request->input('published_at'));

        Page::create($validated);

        return redirect()->route('admin.pages.index')->with('success', 'Page created successfully.');
    }

    public function edit(Page $page): Response
    {
        return Inertia::render('Admin/Pages/Edit', [
            'page' => [
                'id' => $page->id,
                'title' => $page->title,
                'slug' => $page->slug,
                'content' => $page->content,
                'image' => $page->image ? asset('storage/'.$page->image) : null,
                'image_alt' => $page->image_alt,
                'seo_title' => $page->seo_title,
                'seo_description' => $page->seo_description,
                'is_published' => $page->is_published,
                // ISO-8601 so the client can render it in the editor's timezone.
                'published_at' => $page->published_at?->toIso8601String(),
            ],
        ]);
    }

    public function update(Request $request, Page $page): RedirectResponse
    {
        $validated = $this->validatePage($request, $page);
        $validated['image'] = $this->storeHeroImage($request, 'pages', $page->image, $validated['title'] ?? $page->title);
        $validated['is_published'] = $request->boolean('is_published');
        $validated['published_at'] = $this->normalizePublishDate($request->input('published_at'));

        $page->update($validated);

        return redirect()->route('admin.pages.index')->with('success', 'Page updated successfully.');
    }

    public function destroy(Page $page): RedirectResponse
    {
        if ($page->image) {
            Storage::disk('public')->delete($page->image);
        }

        $page->delete();

        return redirect()->route('admin.pages.index')->with('success', 'Page deleted successfully.');
    }

    /**
     * Persists a new menu order from the drag-and-drop admin table.
     */
    public function reorder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', Rule::exists('pages', 'id')],
        ]);

        DB::transaction(function () use ($validated): void {
            foreach ($validated['ids'] as $position => $id) {
                Page::whereKey($id)->update(['sort_order' => $position + 1]);
            }
        });

        return redirect()->back()->with('success', 'Menu order updated.');
    }

    public function toggleNav(Page $page): RedirectResponse
    {
        $page->update(['show_in_nav' => ! $page->show_in_nav]);

        $status = $page->show_in_nav ? 'shown in' : 'hidden from';

        return redirect()->back()->with('success', "Page is now {$status} the main navigation.");
    }

    public function toggleFooter(Page $page): RedirectResponse
    {
        $page->update(['show_in_footer' => ! $page->show_in_footer]);

        $status = $page->show_in_footer ? 'shown in' : 'hidden from';

        return redirect()->back()->with('success', "Page is now {$status} the footer.");
    }

    /** @return array<string, mixed> */
    private function validatePage(Request $request, ?Page $page = null): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::notIn(Page::RESERVED_SLUGS),
                Rule::unique('pages', 'slug')->ignore($page?->getKey()),
            ],
            'content' => ['nullable', 'string'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'is_published' => ['boolean'],
            'published_at' => ['nullable', 'date'],
            ...$this->heroImageRules(),
        ], [
            'slug.not_in' => 'This slug is reserved by the application. Choose another.',
            ...$this->heroImageValidationMessages(),
        ]);
    }
}
