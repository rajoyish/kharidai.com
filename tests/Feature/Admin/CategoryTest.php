<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('can list categories', function () {
    Category::factory()->count(3)->create();

    $response = $this->actingAs($this->admin)->get('/admin/categories');

    $response->assertSuccessful();
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
    $product = Product::factory()->create(['category_id' => $category->id]);

    $response = $this->actingAs($this->admin)->delete('/admin/categories/'.$category->slug);

    $response->assertRedirect();
    $this->assertDatabaseMissing('categories', [
        'id' => $category->id,
    ]);
    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'category_id' => null,
    ]);
});
