<?php

namespace App\Http\Controllers;

use App\Models\Product; // Adjust as needed
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $baseUrl = config('app.url');
        $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

        // Static Routes
        $staticRoutes = [
            '/',
            '/about',
            '/contact',
            '/products', // Add public facing pages here
        ];

        foreach ($staticRoutes as $route) {
            $xml .= '    <url>' . "\n";
            $xml .= '        <loc>' . rtrim($baseUrl, '/') . $route . '</loc>' . "\n";
            $xml .= '        <lastmod>' . now()->toAtomString() . '</lastmod>' . "\n";
            $xml .= '        <changefreq>weekly</changefreq>' . "\n";
            $xml .= '        <priority>' . ($route === '/' ? '1.0' : '0.8') . '</priority>' . "\n";
            $xml .= '    </url>' . "\n";
        }

        // Dynamic Routes (e.g., Products)
        if (class_exists(Product::class)) {
            try {
                $products = Product::select('id', 'slug', 'updated_at')->get();
                foreach ($products as $product) {
                    $xml .= '    <url>' . "\n";
                    $xml .= '        <loc>' . rtrim($baseUrl, '/') . '/products/' . ($product->slug ?? $product->id) . '</loc>' . "\n";
                    $xml .= '        <lastmod>' . $product->updated_at->toAtomString() . '</lastmod>' . "\n";
                    $xml .= '        <changefreq>daily</changefreq>' . "\n";
                    $xml .= '        <priority>0.9</priority>' . "\n";
                    $xml .= '    </url>' . "\n";
                }
            } catch (\Exception $e) {
                // Ignore if table doesn't exist
            }
        }

        $xml .= '</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
        ]);
    }
}
