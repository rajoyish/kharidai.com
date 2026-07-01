<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StorefrontController extends Controller
{
    public function index(): Response
    {
        $categoriesQuery = Category::orderBy('name');
        $uncategorizedQuery = Product::whereNull('category_id')->where('in_stock', true)->with('variants');

        $categoriesQuery->with(['products' => function ($q): void {
            $q->where('in_stock', true)->with('variants');
        }]);

        $categories = $categoriesQuery->get();
        // Only keep categories that have products
        $categories = $categories->filter(function ($category) {
            return $category->products->count() > 0;
        })->values();

        $uncategorizedProducts = $uncategorizedQuery->latest()->get();

        return Inertia::render('welcome', [
            'categories' => $categories,
            'uncategorizedProducts' => $uncategorizedProducts,
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle('Your all-in-one marketplace!'),
                'description' => 'Shop digital goods, subscriptions, services, and physical products from Kharidai.',
                'image' => asset('kharidai_og.png'),
                'imageAlt' => config('app.name').' marketplace preview',
                'url' => route('home'),
                'type' => 'website',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
            ],
        ]);
    }

    public function show(Product $product): Response
    {
        if (! $product->in_stock) {
            abort(404);
        }

        $product->load('variants');

        return Inertia::render('Products/Show', [
            'product' => $product,
            'seo' => [
                'name' => config('app.name'),
                'title' => $this->pageTitle($product->title),
                'description' => $this->seoDescription($product->description, $product->title),
                'image' => $this->productImageUrl($product->image),
                'imageAlt' => $product->title,
                'url' => route('products.show', $product),
                'type' => 'product',
                'robots' => 'index,follow',
                'twitterCard' => 'summary_large_image',
            ],
        ]);
    }

    private function pageTitle(string $title): string
    {
        return $title.' - '.config('app.name');
    }

    private function seoDescription(?string $description, string $fallback): string
    {
        $summary = Str::of(strip_tags((string) $description))
            ->squish()
            ->limit(160)
            ->value();

        return filled($summary) ? $summary : $fallback;
    }

    private function productImageUrl(?string $imagePath): string
    {
        if (! filled($imagePath)) {
            return asset('kharidai_og.png');
        }

        return asset('storage/'.$imagePath);
    }
}
