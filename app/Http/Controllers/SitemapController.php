<?php

namespace App\Http\Controllers;

use App\Models\Page;
use App\Models\Post;
use App\Models\Product;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        $xml .= '    <url>'."\n";
        $xml .= '        <loc>'.route('home').'</loc>'."\n";
        $xml .= '        <lastmod>'.now()->toAtomString().'</lastmod>'."\n";
        $xml .= '        <changefreq>daily</changefreq>'."\n";
        $xml .= '        <priority>1.0</priority>'."\n";
        $xml .= '    </url>'."\n";

        // Dynamic Routes (e.g., Products)
        if (class_exists(Product::class)) {
            try {
                $products = Product::query()
                    ->where('in_stock', true)
                    ->select('id', 'slug', 'updated_at')
                    ->cursor();

                foreach ($products as $product) {
                    $xml .= '    <url>'."\n";
                    $xml .= '        <loc>'.route('products.show', $product).'</loc>'."\n";
                    $xml .= '        <lastmod>'.$product->updated_at->toAtomString().'</lastmod>'."\n";
                    $xml .= '        <changefreq>daily</changefreq>'."\n";
                    $xml .= '        <priority>0.9</priority>'."\n";
                    $xml .= '    </url>'."\n";
                }
            } catch (\Exception $e) {
                // Ignore if table doesn't exist
            }
        }

        $xml .= '    <url>'."\n";
        $xml .= '        <loc>'.route('blog.index').'</loc>'."\n";
        $xml .= '        <lastmod>'.now()->toAtomString().'</lastmod>'."\n";
        $xml .= '        <changefreq>weekly</changefreq>'."\n";
        $xml .= '        <priority>0.8</priority>'."\n";
        $xml .= '    </url>'."\n";

        foreach (Post::query()->published()->select('slug', 'updated_at')->cursor() as $post) {
            $xml .= '    <url>'."\n";
            $xml .= '        <loc>'.route('blog.show', $post).'</loc>'."\n";
            $xml .= '        <lastmod>'.$post->updated_at->toAtomString().'</lastmod>'."\n";
            $xml .= '        <changefreq>weekly</changefreq>'."\n";
            $xml .= '        <priority>0.7</priority>'."\n";
            $xml .= '    </url>'."\n";
        }

        foreach (Page::query()->published()->select('slug', 'updated_at')->cursor() as $page) {
            $xml .= '    <url>'."\n";
            $xml .= '        <loc>'.route('pages.show', $page).'</loc>'."\n";
            $xml .= '        <lastmod>'.$page->updated_at->toAtomString().'</lastmod>'."\n";
            $xml .= '        <changefreq>monthly</changefreq>'."\n";
            $xml .= '        <priority>0.6</priority>'."\n";
            $xml .= '    </url>'."\n";
        }

        $xml .= '</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
        ]);
    }
}
