<?php

namespace App\Http\Controllers;

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
                    ->get();

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

        $xml .= '</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
        ]);
    }
}
