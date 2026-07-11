<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('can list categories', function () {
    Category::factory()->count(3)->create();

    $response = $this->actingAs($this->admin)->get('/admin/categories');

    $response->assertSuccessful();
});

it('filters categories by product type', function () {
    $digital = Category::factory()->create(['type' => 'digital']);
    Category::factory()->create(['type' => 'physical']);

    $response = $this->actingAs($this->admin)->get('/admin/categories?type=digital');

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Categories/Index')
        ->where('filters.type', 'digital')
        ->has('categories', 1)
        ->where('categories.0.id', $digital->id),
    );
});

it('keeps ancestors when filtering categories by type so the hierarchy stays intact', function () {
    // A physical subcategory nested under a parent of a different type: the
    // parent must survive the filter so the child still renders in the tree.
    $parent = Category::factory()->create(['type' => 'digital']);
    $child = Category::factory()->childOf($parent)->create(['type' => 'physical']);

    $response = $this->actingAs($this->admin)->get('/admin/categories?type=physical');

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Categories/Index')
        ->has('categories', 2)
        ->where('categories', fn ($categories) => collect($categories)
            ->pluck('id')
            ->contains($parent->id) && collect($categories)
            ->pluck('id')
            ->contains($child->id)),
    );
});

it('counts product variants rather than base products for each category', function () {
    $category = Category::factory()->create();

    // One base product with two variants must count as two items.
    $product = Product::factory()->hasAttached($category)->create();
    ProductVariant::factory()->count(2)->for($product)->create();

    $response = $this->actingAs($this->admin)->get('/admin/categories');

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Categories/Index')
        ->where('categories.0.id', $category->id)
        ->where('categories.0.product_variants_count', 2),
    );
});

it('can create a category', function () {
    $response = $this->actingAs($this->admin)->post('/admin/categories', [
        'name' => 'New Category',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('categories', [
        'name' => 'New Category',
        'slug' => Str::slug('New Category'),
    ]);
});

it('can update a category', function () {
    $category = Category::factory()->create(['name' => 'Old Category']);

    $response = $this->actingAs($this->admin)->patch('/admin/categories/'.$category->slug, [
        'name' => 'Updated Category',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('categories', [
        'id' => $category->id,
        'name' => 'Updated Category',
        'slug' => Str::slug('Updated Category'),
    ]);
});

it('can delete a category', function () {
    $category = Category::factory()->create();

    $response = $this->actingAs($this->admin)->delete('/admin/categories/'.$category->slug);

    $response->assertRedirect();
    $this->assertDatabaseMissing('categories', [
        'id' => $category->id,
    ]);
});

it('can delete a category without deleting its products', function () {
    $category = Category::factory()->create();
    $product = Product::factory()->hasAttached($category)->create();

    $response = $this->actingAs($this->admin)->delete('/admin/categories/'.$category->slug);

    $response->assertRedirect();
    $this->assertDatabaseMissing('categories', [
        'id' => $category->id,
    ]);
    $this->assertDatabaseHas('products', [
        'id' => $product->id,
    ]);
    $this->assertDatabaseMissing('category_product', [
        'category_id' => $category->id,
        'product_id' => $product->id,
    ]);
});

it('can create a subcategory nested under a parent', function () {
    $parent = Category::factory()->create(['name' => 'Clothes']);

    $response = $this->actingAs($this->admin)->post('/admin/categories', [
        'name' => 'Watches',
        'parent_id' => $parent->id,
        'type' => 'physical',
        'sort_order' => 2,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('categories', [
        'name' => 'Watches',
        'parent_id' => $parent->id,
        'type' => 'physical',
        'sort_order' => 2,
    ]);
});

it('prevents nesting a category under one of its own descendants', function () {
    $parent = Category::factory()->create(['name' => 'Clothes']);
    $child = Category::factory()->childOf($parent)->create(['name' => 'Watches']);

    $response = $this->actingAs($this->admin)->patch('/admin/categories/'.$parent->slug, [
        'name' => 'Clothes',
        'parent_id' => $child->id,
    ]);

    $response->assertSessionHasErrors('parent_id');
    $this->assertDatabaseHas('categories', [
        'id' => $parent->id,
        'parent_id' => null,
    ]);
});

it('reassigns children to the grandparent when a category is deleted', function () {
    $parent = Category::factory()->create();
    $middle = Category::factory()->childOf($parent)->create();
    $leaf = Category::factory()->childOf($middle)->create();

    $this->actingAs($this->admin)->delete('/admin/categories/'.$middle->slug);

    $this->assertDatabaseMissing('categories', ['id' => $middle->id]);
    $this->assertDatabaseHas('categories', [
        'id' => $leaf->id,
        'parent_id' => $parent->id,
    ]);
});
