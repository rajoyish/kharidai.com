<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AdvanceType;
use App\Enums\PricingStrategy;
use App\Enums\ProductType;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::with('categories:id,name')->latest()->get();

        return Inertia::render('Admin/Products/Index', ['products' => $products]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Products/Create', [
            'categories' => $this->categoryOptions(),
            'productTypes' => $this->productTypeOptions(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate(
            array_merge($this->productValidationRules(), $this->serviceValidationRules($request)),
            $this->productValidationMessages(),
        );

        $uploadedFiles = [];

        try {
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('products', 'public');

                if ($imagePath === false) {
                    abort(500, 'Failed to store the product image.');
                }

                $validated['image'] = $imagePath;
                $uploadedFiles[] = $imagePath;
            }

            $galleryPaths = $this->storeNewGalleryFiles($request, $uploadedFiles);

            DB::transaction(function () use ($validated, $request, $galleryPaths) {
                $product = Product::create($validated);
                $product->categories()->sync($request->input('category_ids', []));
                $this->syncGalleries($request, $product, $galleryPaths);
                $this->syncServiceDetail($request, $product);
            });
        } catch (\Throwable $e) {
            if (! empty($uploadedFiles)) {
                Storage::disk('public')->delete($uploadedFiles);
            }
            throw $e;
        }

        return redirect()->route('admin.products.index')->with('success', 'Product created successfully.');
    }

    public function edit(Product $product): Response
    {
        $product->load('galleries', 'categories:id', 'serviceDetail');

        return Inertia::render('Admin/Products/Edit', [
            'product' => $product,
            'categories' => $this->categoryOptions(),
            'productTypes' => $this->productTypeOptions(),
        ]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $validated = $request->validate(
            array_merge($this->productValidationRules(), $this->serviceValidationRules($request)),
            $this->productValidationMessages(),
        );

        unset($validated['image']);
        $oldImage = null;
        $uploadedFiles = [];

        try {
            if ($request->hasFile('image')) {
                if ($product->image) {
                    $oldImage = $product->image;
                }
                $imagePath = $request->file('image')->store('products', 'public');

                if ($imagePath === false) {
                    abort(500, 'Failed to store the product image.');
                }

                $validated['image'] = $imagePath;
                $uploadedFiles[] = $imagePath;
            }

            $galleryPaths = $this->storeNewGalleryFiles($request, $uploadedFiles);

            DB::transaction(function () use ($validated, $request, $product, $galleryPaths) {
                $product->update($validated);
                $product->categories()->sync($request->input('category_ids', []));
                $this->syncGalleries($request, $product, $galleryPaths);
                $this->syncServiceDetail($request, $product);
            });

            if ($oldImage) {
                Storage::disk('public')->delete($oldImage);
            }
        } catch (\Throwable $e) {
            if (! empty($uploadedFiles)) {
                Storage::disk('public')->delete($uploadedFiles);
            }
            throw $e;
        }

        return redirect()->route('admin.products.index')->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }
        foreach ($product->galleries as $gallery) {
            Storage::disk('public')->delete($gallery->image_path);
        }
        $product->delete();

        return redirect()->route('admin.products.index')->with('success', 'Product deleted successfully.');
    }

    public function toggleStock(Product $product): RedirectResponse
    {
        $product->update([
            'in_stock' => ! $product->in_stock,
        ]);

        $status = $product->in_stock ? 'listed in stock' : 'unlisted as out of stock';

        return redirect()->back()->with('success', "Product is now {$status}.");
    }

    public function toggleVisibility(Product $product): RedirectResponse
    {
        $product->update([
            'is_visible' => ! $product->is_visible,
        ]);

        $status = $product->is_visible ? 'visible on the storefront' : 'hidden from the storefront';

        return redirect()->back()->with('success', "Product is now {$status}.");
    }

    /**
     * The selectable categories for admin forms, carrying their `type` so the
     * form can filter the options to match the chosen product type.
     *
     * @return Collection<int, Category>
     */
    protected function categoryOptions()
    {
        return Category::orderBy('name')->get(['id', 'parent_id', 'name', 'type']);
    }

    /**
     * The selectable product types for admin forms.
     *
     * @return list<array{value: string, label: string}>
     */
    protected function productTypeOptions(): array
    {
        return array_map(
            fn (ProductType $type): array => ['value' => $type->value, 'label' => $type->label()],
            ProductType::cases(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    protected function productValidationRules(): array
    {
        return [
            'type' => ['nullable', Rule::enum(ProductType::class)],
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'in_stock' => 'boolean',
            'is_visible' => 'boolean',
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'integer|exists:categories,id',
            'update_galleries' => 'nullable|boolean',
            'new_galleries' => 'nullable|array|max:6',
            'new_galleries.*' => 'image|max:1024',
            'existing_galleries' => 'nullable|array',
            'existing_galleries.*' => 'integer|exists:galleries,id',
            'gallery_orders' => 'nullable|array|max:6',
            'gallery_orders.*' => 'string|distinct',
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function productValidationMessages(): array
    {
        return [
            'gallery_orders.max' => 'A product can have a maximum of 6 gallery images.',
            'new_galleries.*.max' => 'Each new image must be strictly under 1 MB.',
        ];
    }

    /**
     * Validation rules for the service configuration, only enforced when the
     * product being saved is a service. The `pricing_config` payload is validated
     * against the selected strategy's own rules so nothing is hardcoded here.
     *
     * @return array<string, mixed>
     */
    protected function serviceValidationRules(Request $request): array
    {
        if ($request->input('type') !== ProductType::Service->value) {
            return [];
        }

        $rules = [
            'pricing_strategy' => ['required', Rule::enum(PricingStrategy::class)],
            'pricing_config' => ['nullable', 'array'],
            'requires_brief' => ['boolean'],
            'delivery_days' => ['nullable', 'integer', 'min:0'],
            'revisions' => ['nullable', 'integer', 'min:0'],
            'requires_contract' => ['boolean'],
            'requires_advance' => ['boolean'],
            'advance_type' => [Rule::requiredIf($request->boolean('requires_advance')), 'nullable', Rule::enum(AdvanceType::class)],
            'advance_value' => [Rule::requiredIf($request->boolean('requires_advance')), 'nullable', 'integer', 'min:0'],
        ];

        $strategy = PricingStrategy::tryFrom((string) $request->input('pricing_strategy'));

        if ($strategy !== null) {
            foreach ($strategy->calculator()->configRules() as $key => $rule) {
                $rules["pricing_config.{$key}"] = $rule;
            }
        }

        return $rules;
    }

    /**
     * Create or update the service detail for a service product, and remove it
     * when a product is no longer a service.
     */
    protected function syncServiceDetail(Request $request, Product $product): void
    {
        if ($product->type !== ProductType::Service) {
            $product->serviceDetail()->delete();

            return;
        }

        $product->serviceDetail()->updateOrCreate([], [
            'requires_brief' => $request->boolean('requires_brief', true),
            'delivery_days' => $request->input('delivery_days'),
            'revisions' => $request->input('revisions'),
            'pricing_strategy' => $request->input('pricing_strategy'),
            'pricing_config' => $request->input('pricing_config'),
            'requires_contract' => $request->boolean('requires_contract'),
            'requires_advance' => $request->boolean('requires_advance'),
            'advance_type' => $request->boolean('requires_advance') ? $request->input('advance_type') : null,
            'advance_value' => $request->boolean('requires_advance') ? $request->input('advance_value') : null,
        ]);

        $product->ensureOrderableVariant();
    }

    /**
     * Persist newly uploaded gallery files to disk before the database
     * transaction so no I/O is performed while a transaction is open.
     *
     * @param  list<string>  $uploadedFiles  tracked for rollback cleanup on failure
     * @return array<int, string> map of the new_galleries request index to its stored path
     */
    protected function storeNewGalleryFiles(Request $request, array &$uploadedFiles): array
    {
        if (! $request->boolean('update_galleries')) {
            return [];
        }

        $newFiles = $request->file('new_galleries', []);
        $storedPaths = [];

        // Only store files actually referenced by the submitted order.
        foreach ($request->input('gallery_orders', []) as $orderItem) {
            if (! Str::startsWith($orderItem, 'new:')) {
                continue;
            }

            $index = (int) substr($orderItem, 4);
            $file = $newFiles[$index] ?? null;

            if (! $file instanceof UploadedFile || isset($storedPaths[$index])) {
                continue;
            }

            $path = $file->store('products/gallery', 'public');

            if ($path === false) {
                continue;
            }

            $uploadedFiles[] = $path;
            $storedPaths[$index] = $path;
        }

        return $storedPaths;
    }

    /**
     * Reconcile the product's gallery records with the submitted order using
     * files already stored by {@see storeNewGalleryFiles()}. DB writes only.
     *
     * @param  array<int, string>  $storedPaths  map of new_galleries index to its stored path
     */
    protected function syncGalleries(Request $request, Product $product, array $storedPaths): void
    {
        if (! $request->boolean('update_galleries')) {
            return;
        }

        $existingKept = $request->input('existing_galleries', []);
        $orders = $request->input('gallery_orders', []);

        $toDelete = [];

        // Delete removed existing galleries
        $product->galleries()->whereNotIn('id', $existingKept)->get()->each(function ($gallery) use (&$toDelete) {
            $toDelete[] = $gallery->image_path;
            $gallery->delete();
        });

        // Update and insert based on order
        $sortOrder = 0;
        foreach ($orders as $orderItem) {
            if (Str::startsWith($orderItem, 'existing:')) {
                $id = (int) substr($orderItem, 9);
                if (in_array($id, $existingKept)) {
                    $product->galleries()->where('id', $id)->update(['sort_order' => $sortOrder]);
                    $sortOrder++;
                }
            } elseif (Str::startsWith($orderItem, 'new:')) {
                $index = (int) substr($orderItem, 4);
                if (isset($storedPaths[$index])) {
                    $product->galleries()->create([
                        'image_path' => $storedPaths[$index],
                        'sort_order' => $sortOrder,
                    ]);
                    $sortOrder++;
                }
            }
        }

        if (! empty($toDelete)) {
            DB::afterCommit(function () use ($toDelete) {
                Storage::disk('public')->delete($toDelete);
            });
        }
    }
}
