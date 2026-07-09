<?php

namespace App\Http\Controllers;

use App\Models\Post;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    public function index(): Response
    {
        $posts = Post::query()
            ->published()
            ->with('author:id,name')
            ->latest('published_at')
            ->latest('id')
            ->paginate(12)
            ->through(fn (Post $post): array => [
                'title' => $post->title,
                'slug' => $post->slug,
                'excerpt' => $post->excerpt,
                'image' => $post->image ? asset('storage/'.$post->image) : null,
                'image_alt' => $post->image_alt ?? $post->title,
                'author' => $post->author?->name,
                'published_at' => $post->published_at?->toAtomString(),
                'read_time' => $post->read_time,
            ]);

        return Inertia::render('Blog/Index', ['posts' => $posts]);
    }

    public function show(Post $post): Response
    {
        abort_unless($post->isPublished(), 404);

        $post->load('author:id,name');

        return Inertia::render('Blog/Show', [
            'post' => [
                'title' => $post->title,
                'slug' => $post->slug,
                'excerpt' => $post->excerpt,
                'content' => $post->content,
                'image' => $post->image ? asset('storage/'.$post->image) : null,
                'image_alt' => $post->image_alt ?? $post->title,
                'author' => $post->author?->name,
                'published_at' => $post->published_at?->toAtomString(),
                'updated_at' => $post->updated_at?->toAtomString(),
                'read_time' => $post->read_time,
                'seo_title' => $post->seo_title,
                'seo_description' => $post->seo_description,
            ],
        ]);
    }
}
