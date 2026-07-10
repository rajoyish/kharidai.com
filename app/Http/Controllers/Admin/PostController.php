<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\HandlesHeroImage;
use App\Http\Controllers\Concerns\NormalizesPublishDate;
use App\Http\Controllers\Controller;
use App\Models\Post;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PostController extends Controller
{
    use HandlesHeroImage;
    use NormalizesPublishDate;

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->value();

        $posts = Post::query()
            ->with('author:id,name')
            ->when($search, fn ($query) => $query->where('title', 'like', "%{$search}%"))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Post $post): array => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'image' => $post->image ? asset('storage/'.$post->image) : null,
                'author' => $post->author?->name,
                'is_published' => $post->is_published,
                'published_at' => $post->published_at?->toDateString(),
            ]);

        return Inertia::render('Admin/Posts/Index', [
            'posts' => $posts,
            'filters' => ['search' => $search],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Posts/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validatePost($request);
        $validated['image'] = $this->storeHeroImage($request, 'posts', null, $validated['title'] ?? null);
        $validated['is_published'] = $request->boolean('is_published');
        $validated['published_at'] = $this->normalizePublishDate($request->input('published_at'));
        $validated['user_id'] = $request->user()->id;

        Post::create($validated);

        return redirect()->route('admin.posts.index')->with('success', 'Post created successfully.');
    }

    public function edit(Post $post): Response
    {
        return Inertia::render('Admin/Posts/Edit', [
            'post' => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'excerpt' => $post->excerpt,
                'content' => $post->content,
                'image' => $post->image ? asset('storage/'.$post->image) : null,
                'image_alt' => $post->image_alt,
                'seo_title' => $post->seo_title,
                'seo_description' => $post->seo_description,
                'is_published' => $post->is_published,
                // ISO-8601 so the client can render it in the editor's timezone.
                'published_at' => $post->published_at?->toIso8601String(),
            ],
        ]);
    }

    public function update(Request $request, Post $post): RedirectResponse
    {
        $validated = $this->validatePost($request, $post);
        $validated['image'] = $this->storeHeroImage($request, 'posts', $post->image, $validated['title'] ?? $post->title);
        $validated['is_published'] = $request->boolean('is_published');
        $validated['published_at'] = $this->normalizePublishDate($request->input('published_at'));

        $post->update($validated);

        return redirect()->route('admin.posts.index')->with('success', 'Post updated successfully.');
    }

    public function destroy(Post $post): RedirectResponse
    {
        if ($post->image) {
            Storage::disk('public')->delete($post->image);
        }

        $post->delete();

        return redirect()->route('admin.posts.index')->with('success', 'Post deleted successfully.');
    }

    /** @return array<string, mixed> */
    private function validatePost(Request $request, ?Post $post = null): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:255',
                'alpha_dash',
                Rule::unique('posts', 'slug')->ignore($post?->getKey()),
            ],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => ['nullable', 'string'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'is_published' => ['boolean'],
            'published_at' => ['nullable', 'date'],
            ...$this->heroImageRules(),
        ], $this->heroImageValidationMessages());
    }
}
