<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductVariantController extends Controller
{
    public function index(Product $product): Response
    {
        $variants = $product->variants()->latest()->get();

        return Inertia::render('Admin/ProductVariants/Index', [
            'product' => $product,
            'variants' => $variants,
        ]);
    }

    public function create(Product $product): Response
    {
        return Inertia::render('Admin/ProductVariants/Create', ['product' => $product]);
    }

    public function store(Request $request, Product $product): RedirectResponse
    {
        $product->variants()->create($this->validatedData($request));

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant created successfully.');
    }

    public function edit(Product $product, ProductVariant $variant): Response
    {
        return Inertia::render('Admin/ProductVariants/Edit', [
            'product' => $product,
            'variant' => $variant,
        ]);
    }

    public function update(Request $request, Product $product, ProductVariant $variant): RedirectResponse
    {
        $variant->update($this->validatedData($request));

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant updated successfully.');
    }

    /**
     * Validate and normalize the variant payload. A variant carries one
     * shipping weight; color and size are option lists trimmed of blanks.
     *
     * @return array<string, mixed>
     */
    protected function validatedData(Request $request): array
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'details' => 'nullable|string',
            'price_npr' => 'required|numeric|min:0',
            'purchase_price_npr' => 'nullable|numeric|min:0',
            'validity_days' => 'nullable|integer|min:1',
            'colors' => 'nullable|array',
            'colors.*' => 'nullable|string|max:255',
            'sizes' => 'nullable|array',
            'sizes.*' => 'nullable|string|max:255',
            'weight_grams' => 'nullable|integer|min:0',
        ]);

        $validated['colors'] = array_values(array_filter(
            array_map('trim', $validated['colors'] ?? []),
            fn (string $color): bool => $color !== '',
        ));
        $validated['sizes'] = array_values(array_filter(
            array_map('trim', $validated['sizes'] ?? []),
            fn (string $size): bool => $size !== '',
        ));

        return $validated;
    }

    public function destroy(Product $product, ProductVariant $variant): RedirectResponse
    {
        $variant->delete();

        return redirect()->route('admin.products.variants.index', $product)->with('success', 'Variant deleted successfully.');
    }
}
