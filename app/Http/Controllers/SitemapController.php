<?php

namespace App\Http\Controllers;

use App\Enums\ProductType;
use App\Models\Category;
use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $urls = collect([
            $this->url(route('home'), now(), 'daily', '1.0'),
        ])
            ->concat($this->typeListingUrls())
            ->concat($this->productUrls())
            ->concat($this->categoryUrls())
            ->push($this->url(route('blog.index'), now(), 'weekly', '0.8'))
            ->concat($this->postUrls())
            ->concat($this->pageUrls());

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n"
            .$urls->implode('')
            .'</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
        ]);
    }

    /**
     * The three dedicated single-type storefront pages.
     *
     * @return Collection<int, string>
     */
    private function typeListingUrls(): Collection
    {
        return collect(ProductType::cases())
            ->map(fn (ProductType $type): string => $this->url(
                route(match ($type) {
                    ProductType::Digital => 'digital-products.index',
                    ProductType::Physical => 'physical-products.index',
                    ProductType::Service => 'services.index',
                }),
                now(),
                'daily',
                '0.9',
            ));
    }

    /**
     * Only products the detail page will actually serve. `StorefrontController@show`
     * aborts with a 404 unless a product is both in stock *and* visible, so
     * filtering on `in_stock` alone would advertise URLs that 404.
     *
     * @return Collection<int, string>
     */
    private function productUrls(): Collection
    {
        return collect(
            Product::query()
                ->where('in_stock', true)
                ->visible()
                ->select('id', 'slug', 'updated_at')
                ->cursor()
        )->map(fn (Product $product): string => $this->url(
            route('products.show', $product),
            $product->updated_at,
            'daily',
            '0.9',
        ));
    }

    /**
     * Categories that lead somewhere: those holding at least one listable
     * product, directly or through a child category.
     *
     * @return Collection<int, string>
     */
    private function categoryUrls(): Collection
    {
        $listable = fn (Builder $query): Builder => $query->where('in_stock', true)->where('is_visible', true);

        return Category::query()
            ->where(function (Builder $query) use ($listable): void {
                $query->whereHas('products', $listable)
                    ->orWhereHas('children.products', $listable);
            })
            ->select('id', 'slug', 'updated_at')
            ->get()
            ->map(fn (Category $category): string => $this->url(
                route('categories.show', $category),
                $category->updated_at,
                'weekly',
                '0.7',
            ));
    }

    /**
     * @return Collection<int, string>
     */
    private function postUrls(): Collection
    {
        return collect(Post::query()->published()->select('slug', 'updated_at')->cursor())
            ->map(fn (Post $post): string => $this->url(
                route('blog.show', $post),
                $post->updated_at,
                'weekly',
                '0.7',
            ));
    }

    /**
     * @return Collection<int, string>
     */
    private function pageUrls(): Collection
    {
        return collect(Page::query()->published()->select('slug', 'updated_at')->cursor())
            ->map(fn (Page $page): string => $this->url(
                route('pages.show', $page),
                $page->updated_at,
                'monthly',
                '0.6',
            ));
    }

    /**
     * A single `<url>` entry. Locations are escaped because slugs flow into the
     * URL and the sitemap spec requires entity-escaped values.
     */
    private function url(string $location, ?DateTimeInterface $lastModified, string $changeFrequency, string $priority): string
    {
        return '    <url>'."\n"
            .'        <loc>'.htmlspecialchars($location, ENT_XML1 | ENT_QUOTES, 'UTF-8').'</loc>'."\n"
            .'        <lastmod>'.Carbon::instance($lastModified ?? now())->toAtomString().'</lastmod>'."\n"
            .'        <changefreq>'.$changeFrequency.'</changefreq>'."\n"
            .'        <priority>'.$priority.'</priority>'."\n"
            .'    </url>'."\n";
    }
}
