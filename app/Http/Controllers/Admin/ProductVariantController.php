<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Inertia\Inertia;
use Illuminate\Http\Request;

class ProductVariantController extends Controller
{
    public function index(Product $product)
    {
        $variants = $product->variants()->latest()->get();
        return Inertia::render('Admin/ProductVariants/Index', [
            'product' => $product,
            'variants' => $variants,
        ]);
    }

    public function create(Product $product)
    {
        return Inertia::render('Admin/ProductVariants/Create', ['product' => $product]);
    }

    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'details' => 'nullable|string',
            'price_npr' => 'required|numeric|min:0',
            'purchase_price_npr' => 'nullable|numeric|min:0',
        ]);

        $product->variants()->create($validated);

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant created successfully.');
    }

    public function edit(Product $product, ProductVariant $variant)
    {
        return Inertia::render('Admin/ProductVariants/Edit', [
            'product' => $product,
            'variant' => $variant,
        ]);
    }

    public function update(Request $request, Product $product, ProductVariant $variant)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'details' => 'nullable|string',
            'price_npr' => 'required|numeric|min:0',
            'purchase_price_npr' => 'nullable|numeric|min:0',
        ]);

        $variant->update($validated);

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant updated successfully.');
    }

    public function destroy(Product $product, ProductVariant $variant)
    {
        $variant->delete();

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant deleted successfully.');
    }
}
