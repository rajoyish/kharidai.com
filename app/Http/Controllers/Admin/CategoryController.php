<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ProductType;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(Request $request): Response
    {
        $type = ProductType::tryFrom((string) $request->query('type'));
        $search = $request->string('search')->trim()->value();

        $categories = Category::query()
            ->select(['id', 'parent_id', 'name', 'slug', 'type', 'sort_order'])
            ->with('parent:id,name')
            ->withProductVariantsCount()
            // A match whose parent is filtered out is surfaced at the root of the
            // tree by the client rather than hidden, so searching stays lossless.
            ->when($search, fn ($query) => $query->where('name', 'like', "%{$search}%"))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        if ($type !== null) {
            $categories = $this->filterCategoriesByType($categories, $type);
        }

        return Inertia::render('Admin/Categories/Index', [
            'categories' => $categories->values(),
            'productTypes' => $this->productTypeOptions(),
            'filters' => ['type' => $type?->value, 'search' => $search],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateCategory($request);

        Category::create($validated);

        return redirect()->back()->with('success', 'Category created successfully.');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $validated = $this->validateCategory($request, $category);

        $category->update($validated);

        return redirect()->back()->with('success', 'Category updated successfully.');
    }

    public function destroy(Category $category): RedirectResponse
    {
        // Detach products and re-parent children to keep the tree consistent.
        $category->products()->detach();
        $category->children()->update(['parent_id' => $category->parent_id]);
        $category->delete();

        return redirect()->back()->with('success', 'Category deleted successfully.');
    }

    /**
     * @return array{name: string, parent_id: int|null, type: string|null, sort_order: int}
     */
    protected function validateCategory(Request $request, ?Category $category = null): array
    {
        $uniqueName = Rule::unique('categories', 'name');

        if ($category !== null) {
            $uniqueName->ignore($category->id);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', $uniqueName],
            'parent_id' => [
                'nullable',
                'integer',
                'exists:categories,id',
                function (string $attribute, mixed $value, callable $fail) use ($category): void {
                    if ($category === null || $value === null) {
                        return;
                    }

                    $parent = Category::query()->where('id', $value)->first();

                    if ($parent !== null && $category->wouldCreateCycleWith($parent)) {
                        $fail('A category cannot be nested under itself or one of its own subcategories.');
                    }
                },
            ],
            'type' => ['nullable', Rule::enum(ProductType::class)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        // sort_order is non-nullable in the database; default an omitted/blank value to 0.
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        return $validated;
    }

    /**
     * Reduce the category collection to those matching the given product type,
     * keeping every ancestor of a match so the parent-child hierarchy stays
     * intact when the tree is rebuilt on the client.
     *
     * @param  Collection<int, Category>  $categories
     * @return Collection<int, Category>
     */
    protected function filterCategoriesByType(Collection $categories, ProductType $type): Collection
    {
        $byId = $categories->keyBy('id');
        $keep = [];

        foreach ($categories as $category) {
            if ($category->type !== $type) {
                continue;
            }

            $current = $category;

            while ($current !== null && ! isset($keep[$current->id])) {
                $keep[$current->id] = true;
                $current = $current->parent_id !== null ? $byId->get($current->parent_id) : null;
            }
        }

        return $categories->filter(fn (Category $category): bool => isset($keep[$category->id]));
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    protected function productTypeOptions(): array
    {
        return array_map(
            fn (ProductType $type): array => ['value' => $type->value, 'label' => $type->label()],
            ProductType::cases(),
        );
    }
}
