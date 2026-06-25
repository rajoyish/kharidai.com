<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StorefrontController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::where('in_stock', true)->with('variants');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
        }

        $products = $query->latest()->get();

        return Inertia::render('welcome', [
            'products' => $products,
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
