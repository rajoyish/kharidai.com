<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Product;
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

it('omits a deleted line while rendering the rest of the cart', function (string $deletedRelation) {
    $user = User::factory()->create();
    $cart = Cart::factory()->for($user)->create();
    $removed = CartItem::factory()->for($cart)->create();
    $variant = $removed->productVariant;
    $product = $variant->product;
    $freeService = ProductVariant::factory()->for(Product::factory()->service())->create(['price_npr' => 0]);
    $remaining = CartItem::factory()->for($cart)->for($freeService, 'productVariant')->create();

    if ($deletedRelation === 'variant') {
        CartItem::retrieved(function (CartItem $item) use ($removed, $variant): void {
            if ($item->is($removed)) {
                $variant->delete();
            }
        });
    } else {
        ProductVariant::retrieved(function (ProductVariant $loaded) use ($variant, $product): void {
            if ($loaded->is($variant)) {
                $product->delete();
            }
        });
    }

    $this->actingAs($user)->get(route('cart.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('cart.items', 1)
            ->where('cart.items.0.id', $remaining->id)
            ->where('hasUnavailableItems', false)
            ->where('canCheckoutDirectly', true),
        );
})->with(['variant', 'product']);

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

    $this->actingAs($user)
        ->get(route('cart.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->hasFlash('toast', ['type' => 'success', 'message' => 'Added to cart.']),
        );
});

it('refuses to add a variant whose product is hidden or out of stock', function (array $state) {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->for(Product::factory()->state($state))->create();

    $this->actingAs($user)
        ->from(route('products.show', $variant->product))
        ->followingRedirects()
        ->post(route('cart.add'), ['product_variant_id' => $variant->id, 'quantity' => 1])
        ->assertInertia(fn (Assert $page) => $page
            ->component('Cart/Index')
            ->hasFlash('toast', ['type' => 'error', 'message' => 'This product is no longer available.']),
        );

    $this->assertDatabaseMissing('cart_items', ['product_variant_id' => $variant->id]);
})->with([
    'hidden' => [['is_visible' => false]],
    'out of stock' => [['in_stock' => false]],
]);

it('shows the unavailable toast for a deleted product during add to cart', function (string $timing) {
    $user = User::factory()->create();
    $variant = ProductVariant::factory()->create();
    $product = $variant->product;

    if ($timing === 'before the request') {
        $product->delete();
    } else {
        ProductVariant::retrieved(function () use ($product): void {
            $product->delete();
        });
    }

    $this->actingAs($user)
        ->from(route('products.show', $product))
        ->followingRedirects()
        ->post(route('cart.add'), ['product_variant_id' => $variant->id, 'quantity' => 1])
        ->assertInertia(fn (Assert $page) => $page
            ->component('Cart/Index')
            ->hasFlash('toast', ['type' => 'error', 'message' => 'This product is no longer available.']),
        );

    $this->assertDatabaseMissing('cart_items', ['product_variant_id' => $variant->id]);
})->with(['before the request', 'after loading the variant']);

it('flags a cart line whose product went unavailable and holds back checkout', function () {
    $user = User::factory()->create();
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    $item = CartItem::factory()->create(['cart_id' => $cart->id]);
    $item->productVariant->product->update(['in_stock' => false]);

    $this->actingAs($user)
        ->get('/cart')
        ->assertInertia(fn (Assert $page) => $page
            ->where('cart.items.0.is_available', false)
            ->where('hasUnavailableItems', true)
            ->where('canCheckoutDirectly', false),
        );

    $this->actingAs($user)
        ->get(route('checkout.index'))
        ->assertRedirect(route('cart.index'));

    $this->actingAs($user)
        ->post(route('checkout.process'))
        ->assertRedirect(route('cart.index'));

    expect(Order::query()->count())->toBe(0);
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

it('ships only the cart fields the page renders', function () {
    $user = User::factory()->create();
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    $variant = ProductVariant::factory()->create(['purchase_price_npr' => 1234]);
    CartItem::factory()->create([
        'cart_id' => $cart->id,
        'product_variant_id' => $variant->id,
    ]);

    $response = $this->actingAs($user)->get('/cart');

    $response->assertInertia(fn (Assert $page) => $page
        ->has('cart.items.0', fn (Assert $item) => $item
            ->hasAll(['id', 'quantity', 'selected_options', 'is_available', 'product_variant'])
            ->has('product_variant', fn (Assert $variantProp) => $variantProp
                ->hasAll(['id', 'name', 'price_npr', 'product'])
                ->has('product', fn (Assert $product) => $product
                    ->hasAll(['id', 'title', 'image']),
                ),
            ),
        ),
    );
});

it('serves a quantity change as a partial reload of just the cart props', function () {
    $user = User::factory()->create();
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id, 'quantity' => 1]);

    $version = $this->actingAs($user)
        ->withHeader('X-Inertia', 'true')
        ->get('/cart')
        ->headers->get('x-inertia-version');

    $response = $this->actingAs($user)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
            'X-Inertia-Partial-Component' => 'Cart/Index',
            'X-Inertia-Partial-Data' => 'cart,canCheckoutDirectly,hasUnavailableItems,cartCount',
        ])
        ->get('/cart');

    $response->assertOk();
    $response->assertJsonPath('component', 'Cart/Index');
    $response->assertJsonStructure(['props' => ['cart', 'canCheckoutDirectly', 'hasUnavailableItems', 'cartCount']]);
    // The expensive shared props are closures, so a partial reload never runs them.
    $response->assertJsonMissingPath('props.paymentMethods');
    $response->assertJsonMissingPath('props.storefront');
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
