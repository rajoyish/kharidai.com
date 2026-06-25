<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StorefrontController extends Controller
{
    public function index(Request $request)
    {
        $categoriesQuery = Category::orderBy('name');
        $uncategorizedQuery = Product::whereNull('category_id')->where('in_stock', true)->with('variants');

        if ($request->has('search')) {
            $search = $request->input('search');
            
            $categoriesQuery->with(['products' => function ($q) use ($search) {
                $q->where('in_stock', true)
                  ->with('variants')
                  ->where(function($subQ) use ($search) {
                      $subQ->where('title', 'like', "%{$search}%")
                           ->orWhere('description', 'like', "%{$search}%");
                  });
            }]);
            
            $uncategorizedQuery->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        } else {
            $categoriesQuery->with(['products' => function ($q) {
                $q->where('in_stock', true)->with('variants');
            }]);
        }

        $categories = $categoriesQuery->get();
        // Only keep categories that have products (useful for search)
        if ($request->has('search')) {
             $categories = $categories->filter(function($category) {
                 return $category->products->count() > 0;
             })->values();
        }

        $uncategorizedProducts = $uncategorizedQuery->latest()->get();

        return Inertia::render('welcome', [
            'categories' => $categories,
            'uncategorizedProducts' => $uncategorizedProducts,
            'filters' => $request->only(['search'])
        ]);
    }

    public function show(Product $product)
    {
        if (!$product->in_stock) {
            abort(404);
        }
        
        $product->load('variants');
        return Inertia::render('Products/Show', [
            'product' => $product
        ]);
    }
}
