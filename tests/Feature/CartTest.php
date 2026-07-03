<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('can view the cart', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/cart');

    $response->assertSuccessful();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('Cart/Index')
        ->missing('storefront'),
    );
});

it('can add an item to the cart', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->create();

    $response = $this->actingAs($user)
        ->from(route('products.show', $variant->product))
        ->post(route('cart.add'), [
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);

    $response->assertRedirect(route('products.show', $variant->product));
    $this->assertDatabaseHas('cart_items', [
        'product_variant_id' => $variant->id,
        'quantity' => 2,
    ]);
});

it('can update a cart item quantity', function () {
    $user = User::factory()->create();
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    $cartItem = CartItem::factory()->create([
        'cart_id' => $cart->id,
        'quantity' => 1,
    ]);

    $response = $this->actingAs($user)->put('/cart/'.$cartItem->id, [
        'quantity' => 5,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('cart_items', [
        'id' => $cartItem->id,
        'quantity' => 5,
    ]);
});

it('can remove an item from the cart', function () {
    $user = User::factory()->create();
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    $cartItem = CartItem::factory()->create([
        'cart_id' => $cart->id,
    ]);

    $response = $this->actingAs($user)->delete('/cart/'.$cartItem->id);

    $response->assertRedirect();
    $this->assertDatabaseMissing('cart_items', [
        'id' => $cartItem->id,
    ]);
});
