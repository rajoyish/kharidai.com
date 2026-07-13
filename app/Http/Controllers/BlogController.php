<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BuildsSeoMetadata;
use App\Models\Post;
use Inertia\Inertia;
use Inertia\Response;

class BlogController extends Controller
{
    use BuildsSeoMetadata;

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

        $seoImage = $this->defaultSeoImage();

        return Inertia::render('Blog/Index', [
            'posts' => $posts,
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle('Blog'),
                'description' => 'News, guides, and updates from the Kharidai team.',
                'image' => $seoImage['url'],
                'imageAlt' => config('app.name').' blog preview',
                'imageType' => $seoImage['type'],
                'imageWidth' => $seoImage['width'],
                'imageHeight' => $seoImage['height'],
                'url' => route('blog.index'),
                'type' => 'website',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'jsonLd' => [
                    $this->organizationSchema(),
                    [
                        '@type' => 'Blog',
                        'name' => $this->pageTitle('Blog'),
                        'url' => route('blog.index'),
                        'publisher' => ['@id' => route('home').'#organization'],
                    ],
                    $this->breadcrumbSchema([
                        ['name' => 'Home', 'url' => route('home')],
                        ['name' => 'Blog', 'url' => route('blog.index')],
                    ]),
                ],
            ],
        ]);
    }

    public function show(Post $post): Response
    {
        abort_unless($post->isPublished(), 404);

        $post->load('author:id,name');

        $seoImage = $this->storageSeoImage($post->image);
        $description = $post->seo_description ?? $post->excerpt ?? $this->seoDescription($post->content, $post->title);

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
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle($post->seo_title ?? $post->title),
                'description' => $description,
                'image' => $seoImage['url'],
                'imageAlt' => $post->image_alt ?? $post->title,
                'imageType' => $seoImage['type'],
                'imageWidth' => $seoImage['width'],
                'imageHeight' => $seoImage['height'],
                'url' => route('blog.show', $post),
                'type' => 'article',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'updatedTime' => $post->updated_at?->toAtomString(),
                'jsonLd' => [
                    $this->organizationSchema(),
                    array_filter([
                        '@type' => 'BlogPosting',
                        'headline' => $post->title,
                        'description' => $description,
                        'image' => [$seoImage['url']],
                        'datePublished' => $post->published_at?->toAtomString(),
                        'dateModified' => $post->updated_at?->toAtomString(),
                        'author' => $post->author?->name
                            ? ['@type' => 'Person', 'name' => $post->author->name]
                            : null,
                        'publisher' => ['@id' => route('home').'#organization'],
                        'mainEntityOfPage' => [
                            '@type' => 'WebPage',
                            '@id' => route('blog.show', $post),
                        ],
                    ], fn (mixed $value): bool => $value !== null),
                    $this->breadcrumbSchema([
                        ['name' => 'Home', 'url' => route('home')],
                        ['name' => 'Blog', 'url' => route('blog.index')],
                        ['name' => $post->title, 'url' => route('blog.show', $post)],
                    ]),
                ],
            ],
        ]);
    }
}
