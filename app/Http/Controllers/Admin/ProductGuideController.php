<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductGuide;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Authoring for the reusable delivery guides a product hands its buyers.
 *
 * Nested under the product because a guide has no identity without one, and
 * because keeping it out of the product form leaves room for several guides —
 * "Install", "Activate", "Troubleshoot" — instead of one sprawling document.
 *
 * There is no show action on purpose. A guide is read on the order page that
 * unlocks it and nowhere else.
 */
class ProductGuideController extends Controller
{
    public function index(Product $product): Response
    {
        $this->ensureProductSupportsGuides($product);

        return Inertia::render('Admin/ProductGuides/Index', [
            'product' => $this->productPayload($product),
            'guides' => $product->guides()->get()->map(fn (ProductGuide $guide): array => [
                'id' => $guide->id,
                'title' => $guide->title,
                'is_published' => $guide->is_published,
                'sort_order' => $guide->sort_order,
                'updated_at' => $guide->updated_at?->toIso8601String(),
            ]),
        ]);
    }

    public function create(Product $product): Response
    {
        $this->ensureProductSupportsGuides($product);

        return Inertia::render('Admin/ProductGuides/Create', [
            'product' => $this->productPayload($product),
            'nextSortOrder' => (int) $product->guides()->max('sort_order') + 1,
        ]);
    }

    public function store(Request $request, Product $product): RedirectResponse
    {
        $this->ensureProductSupportsGuides($product);

        $product->guides()->create($this->validatedData($request))->syncEmbeddedMedia();

        return redirect()
            ->route('admin.products.guides.index', $product)
            ->with('success', 'Guide created successfully.');
    }

    public function edit(Product $product, ProductGuide $guide): Response
    {
        $this->ensureProductSupportsGuides($product);
        $this->ensureGuideBelongsToProduct($product, $guide);

        return Inertia::render('Admin/ProductGuides/Edit', [
            'product' => $this->productPayload($product),
            'guide' => [
                'id' => $guide->id,
                'title' => $guide->title,
                'content' => $guide->content,
                'is_published' => $guide->is_published,
                'sort_order' => $guide->sort_order,
            ],
        ]);
    }

    public function update(Request $request, Product $product, ProductGuide $guide): RedirectResponse
    {
        $this->ensureProductSupportsGuides($product);
        $this->ensureGuideBelongsToProduct($product, $guide);

        $guide->update($this->validatedData($request));

        // The body decides who may fetch each embedded image, so the record of
        // what it embeds has to be rewritten with it.
        $guide->syncEmbeddedMedia();

        return redirect()
            ->route('admin.products.guides.index', $product)
            ->with('success', 'Guide updated successfully.');
    }

    public function destroy(Product $product, ProductGuide $guide): RedirectResponse
    {
        $this->ensureProductSupportsGuides($product);
        $this->ensureGuideBelongsToProduct($product, $guide);

        $guide->delete();

        return redirect()
            ->route('admin.products.guides.index', $product)
            ->with('success', 'Guide deleted successfully.');
    }

    /**
     * A service is scoped and delivered per engagement, so it has no single
     * document every buyer reads. Closed off here rather than only hidden in
     * the UI, so a hand-typed URL cannot author one either.
     */
    private function ensureProductSupportsGuides(Product $product): void
    {
        abort_unless($product->type->supportsGuides(), 404);
    }

    /**
     * The product is bound by slug and the guide by id, so nothing in the URL
     * ties the two together. Without this check, any guide id under any product
     * slug would edit and delete happily.
     */
    private function ensureGuideBelongsToProduct(Product $product, ProductGuide $guide): void
    {
        abort_unless($guide->product_id === $product->id, 404);
    }

    /**
     * @return array{id: int, title: string, slug: string|null, type: string}
     */
    private function productPayload(Product $product): array
    {
        return [
            'id' => $product->id,
            'title' => $product->title,
            'slug' => $product->slug,
            'type' => $product->type->value,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedData(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'is_published' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ]);

        $validated['is_published'] = $request->boolean('is_published');
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        return $validated;
    }
}
