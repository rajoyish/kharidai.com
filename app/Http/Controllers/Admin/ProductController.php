<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::with('category')->latest()->get();

        return Inertia::render('Admin/Products/Index', ['products' => $products]);
    }

    public function create()
    {
        return Inertia::render('Admin/Products/Create', [
            'categories' => Category::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate($this->productValidationRules(), $this->productValidationMessages());

        $uploadedFiles = [];

        try {
            if ($request->hasFile('image')) {
                $validated['image'] = $request->file('image')->store('products', 'public');
                $uploadedFiles[] = $validated['image'];
            }

            $galleryPaths = $this->storeNewGalleryFiles($request, $uploadedFiles);

            DB::transaction(function () use ($validated, $request, $galleryPaths) {
                $product = Product::create($validated);
                $this->syncGalleries($request, $product, $galleryPaths);
            });
        } catch (\Throwable $e) {
            if (! empty($uploadedFiles)) {
                Storage::disk('public')->delete($uploadedFiles);
            }
            throw $e;
        }

        return redirect()->route('admin.products.index')->with('success', 'Product created successfully.');
    }

    public function edit(Product $product)
    {
        $product->load('galleries');

        return Inertia::render('Admin/Products/Edit', [
            'product' => $product,
            'categories' => Category::orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate($this->productValidationRules(), $this->productValidationMessages());

        unset($validated['image']);
        $oldImage = null;
        $uploadedFiles = [];

        try {
            if ($request->hasFile('image')) {
                if ($product->image) {
                    $oldImage = $product->image;
                }
                $validated['image'] = $request->file('image')->store('products', 'public');
                $uploadedFiles[] = $validated['image'];
            }

            $galleryPaths = $this->storeNewGalleryFiles($request, $uploadedFiles);

            DB::transaction(function () use ($validated, $request, $product, $galleryPaths) {
                $product->update($validated);
                $this->syncGalleries($request, $product, $galleryPaths);
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

    public function destroy(Product $product)
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

    public function toggleStock(Product $product)
    {
        $product->update([
            'in_stock' => ! $product->in_stock,
        ]);

        $status = $product->in_stock ? 'listed in stock' : 'unlisted as out of stock';

        return redirect()->back()->with('success', "Product is now {$status}.");
    }

    /**
     * @return array<string, string>
     */
    protected function productValidationRules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'image' => 'nullable|image|max:2048',
            'in_stock' => 'boolean',
            'category_id' => 'nullable|exists:categories,id',
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

            if (isset($newFiles[$index]) && ! isset($storedPaths[$index])) {
                $path = $newFiles[$index]->store('products/gallery', 'public');
                $uploadedFiles[] = $path;
                $storedPaths[$index] = $path;
            }
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
