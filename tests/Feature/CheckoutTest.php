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
        'additional_data' => 'test note',
    ]);

    $order = Order::first();
    expect($order)->not->toBeNull()
        ->and($order->status)->toBe('pending');

    $response->assertRedirect(route('checkout.npr', $order));
    $this->assertDatabaseMissing('carts', ['id' => $cart->id]);

    Notification::assertSentTo($this->admin, OrderPlacedNotification::class);
});

it('can view NPR payment page', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->user)->get('/checkout/'.$order->id.'/npr');

    $response->assertSuccessful();
});

it('can process NPR payment receipt upload', function () {
    Notification::fake();
    Storage::fake('public');

    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
    ]);

    $file = UploadedFile::fake()->image('receipt.jpg');

    $response = $this->actingAs($this->user)->post('/checkout/'.$order->id.'/npr', [
        'receipt' => $file,
    ]);

    $response->assertRedirect(route('orders.show', $order));
    $this->assertDatabaseHas('payment_receipts', [
        'order_id' => $order->id,
    ]);

    Notification::assertSentTo($this->admin, PaymentReceiptUploadedNotification::class);
});

it('can process NPR payment receipt re-upload and deletes old receipt', function () {
    Notification::fake();
    Storage::fake('public');

    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'can_reupload_receipt' => true,
    ]);

    $oldFile = UploadedFile::fake()->image('old_receipt.jpg');
    $oldPath = $oldFile->store('receipts', 'public');

    $order->paymentReceipt()->create([
        'file_path' => $oldPath,
        'status' => 'rejected',
    ]);

    $newFile = UploadedFile::fake()->image('new_receipt.jpg');

    $response = $this->actingAs($this->user)->post('/checkout/'.$order->id.'/npr', [
        'receipt' => $newFile,
    ]);

    $response->assertRedirect(route('orders.show', $order));
    $order->refresh();
    expect($order->can_reupload_receipt)->toBeFalse();
    $this->assertDatabaseCount('payment_receipts', 1);
    Storage::disk('public')->assertMissing($oldPath);
});

it('cannot upload receipt if already uploaded and can_reupload_receipt is false', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
        'can_reupload_receipt' => false,
    ]);

    $order->paymentReceipt()->create([
        'file_path' => 'dummy.jpg',
        'status' => 'pending',
    ]);

    $file = UploadedFile::fake()->image('receipt.jpg');

    $response = $this->actingAs($this->user)->post('/checkout/'.$order->id.'/npr', [
        'receipt' => $file,
    ]);

    $response->assertRedirect(route('orders.show', $order));
    $response->assertSessionHas('error', 'Receipt already uploaded.');
});
