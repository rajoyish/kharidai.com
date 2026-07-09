<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BuildsSeoMetadata;
use App\Models\Page;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    use BuildsSeoMetadata;

    public function show(Page $page): Response
    {
        abort_unless($page->isPublished(), 404);

        $seoImage = $this->storageSeoImage($page->image);

        return Inertia::render('Pages/Show', [
            'page' => [
                'title' => $page->title,
                'slug' => $page->slug,
                'content' => $page->content,
                'image' => $page->image ? asset('storage/'.$page->image) : null,
                'image_alt' => $page->image_alt,
                'seo_title' => $page->seo_title,
                'seo_description' => $page->seo_description,
                'updated_at' => $page->updated_at?->toAtomString(),
            ],
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle($page->seo_title ?? $page->title),
                'description' => $page->seo_description ?? $this->seoDescription($page->content, $page->title),
                'image' => $seoImage['url'],
                'imageAlt' => $page->image_alt ?? $page->title,
                'imageType' => $seoImage['type'],
                'imageWidth' => $seoImage['width'],
                'imageHeight' => $seoImage['height'],
                'url' => route('pages.show', $page),
                'type' => 'article',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
                'updatedTime' => $page->updated_at?->toAtomString(),
            ],
        ]);
    }
}
