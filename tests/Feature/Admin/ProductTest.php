<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('can list products', function () {
    Product::factory()->count(3)->create();

    $response = $this->actingAs($this->admin)->get('/admin/products');

    $response->assertSuccessful();
});

it('can create a product', function () {
    $response = $this->actingAs($this->admin)->post('/admin/products', [
        'title' => 'New Product',
        'description' => 'Test description',
        'in_stock' => true,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'title' => 'New Product',
        'in_stock' => true,
    ]);
});

it('can update a product', function () {
    $product = Product::factory()->create(['title' => 'Old Product']);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->id, [
        'title' => 'Updated Product',
        'description' => 'Updated description',
        'in_stock' => false,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'title' => 'Updated Product',
        'in_stock' => false,
    ]);
});

it('can delete a product', function () {
    $product = Product::factory()->create();

    $response = $this->actingAs($this->admin)->delete('/admin/products/'.$product->id);

    $response->assertRedirect();
    $this->assertDatabaseMissing('products', [
        'id' => $product->id,
    ]);
});

it('can toggle product stock status', function () {
    $product = Product::factory()->create(['in_stock' => true]);

    $response = $this->actingAs($this->admin)->patch('/admin/products/'.$product->id.'/toggle-stock');

    $response->assertRedirect();
    $this->assertDatabaseHas('products', [
        'id' => $product->id,
        'in_stock' => false,
    ]);
});
