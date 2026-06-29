<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\PaymentReceiptUploadedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('redirects to cart if checkout index is accessed with an empty cart', function () {
    $response = $this->actingAs($this->user)->get('/checkout');
    
    $response->assertRedirect(route('cart.index'));
});

it('can view the checkout page with items in cart', function () {
    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id]);

    $response = $this->actingAs($this->user)->get('/checkout');
    
    $response->assertSuccessful();
});

it('can process NPR checkout', function () {
    Notification::fake();

    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id]);

    $response = $this->actingAs($this->user)->post('/checkout', [
        'currency' => 'npr',
        'additional_data' => 'test note',
    ]);

    $order = Order::first();
    expect($order)->not->toBeNull()
        ->and($order->currency)->toBe('npr')
        ->and($order->status)->toBe('pending');
        
    $response->assertRedirect(route('checkout.npr', $order));
    $this->assertDatabaseMissing('carts', ['id' => $cart->id]);
    
    Notification::assertSentTo($this->admin, OrderPlacedNotification::class);
});

it('can process USD checkout (mock)', function () {
    Notification::fake();

    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id]);

    $response = $this->actingAs($this->user)->post('/checkout', [
        'currency' => 'usd',
    ]);

    $order = Order::first();
    expect($order)->not->toBeNull()
        ->and($order->currency)->toBe('usd');
        
    $response->assertRedirect(route('orders.show', $order));
    $this->assertDatabaseMissing('carts', ['id' => $cart->id]);
    
    Notification::assertSentTo($this->admin, OrderPlacedNotification::class);
});

it('can view NPR payment page', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'currency' => 'npr',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->user)->get('/checkout/' . $order->id . '/npr');
    
    $response->assertSuccessful();
});

it('can process NPR payment receipt upload', function () {
    Notification::fake();
    Storage::fake('public');

    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'currency' => 'npr',
        'status' => 'pending',
    ]);

    $file = UploadedFile::fake()->image('receipt.jpg');

    $response = $this->actingAs($this->user)->post('/checkout/' . $order->id . '/npr', [
        'receipt' => $file,
    ]);

    $response->assertRedirect(route('orders.show', $order));
    $this->assertDatabaseHas('payment_receipts', [
        'order_id' => $order->id,
    ]);
    
    Notification::assertSentTo($this->admin, PaymentReceiptUploadedNotification::class);
});

it('can view usd success page', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'currency' => 'usd',
    ]);

    $response = $this->actingAs($this->user)->get('/checkout/' . $order->id . '/usd/success');
    
    $response->assertRedirect(route('orders.show', $order));
});

it('can view usd cancel page', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'currency' => 'usd',
    ]);

    $response = $this->actingAs($this->user)->get('/checkout/' . $order->id . '/usd/cancel');
    
    $response->assertRedirect(route('cart.index'));
});
