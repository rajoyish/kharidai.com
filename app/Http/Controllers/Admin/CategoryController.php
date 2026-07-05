<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ProductType;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Categories/Index', [
            'categories' => Category::query()
                ->with('parent:id,name')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'parent_id', 'name', 'slug', 'type', 'sort_order']),
            'productTypes' => $this->productTypeOptions(),
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
        $category->products()->update(['category_id' => null]);
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

                    $parent = Category::find($value);

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
