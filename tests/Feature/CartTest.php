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

    $response->assertRedirect(route('cart.index'));
    $this->assertDatabaseHas('cart_items', [
        'product_variant_id' => $variant->id,
        'quantity' => 2,
    ]);
});

it('captures the selected color and size when adding a variant with options', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->create([
        'colors' => ['Red', 'Black'],
        'sizes' => ['M', 'L'],
    ]);

    $this->actingAs($user)->post(route('cart.add'), [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
        'selected_options' => ['color' => 'Black', 'size' => 'L'],
    ]);

    $item = CartItem::query()->where('product_variant_id', $variant->id)->first();
    expect($item->selected_options)->toBe(['color' => 'Black', 'size' => 'L']);
});

it('rejects adding a variant with options when no choice is made', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->create([
        'sizes' => ['M', 'L'],
    ]);

    $response = $this->actingAs($user)->post(route('cart.add'), [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
    ]);

    $response->assertSessionHasErrors('selected_options.size');
    $this->assertDatabaseMissing('cart_items', ['product_variant_id' => $variant->id]);
});

it('rejects an option that the variant does not offer', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->create([
        'sizes' => ['M', 'L'],
    ]);

    $response = $this->actingAs($user)->post(route('cart.add'), [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
        'selected_options' => ['size' => 'XXL'],
    ]);

    $response->assertSessionHasErrors('selected_options.size');
});

it('keeps different option choices of the same variant as separate lines', function () {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->create([
        'sizes' => ['M', 'L'],
    ]);

    $this->actingAs($user)->post(route('cart.add'), [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
        'selected_options' => ['size' => 'M'],
    ]);
    $this->actingAs($user)->post(route('cart.add'), [
        'product_variant_id' => $variant->id,
        'quantity' => 1,
        'selected_options' => ['size' => 'L'],
    ]);

    expect(CartItem::query()->where('product_variant_id', $variant->id)->count())->toBe(2);
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
