<?php

use App\Mail\OrderPlaced;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\ProductVariant;
use App\Models\User;
use App\Notifications\OrderPlacedNotification;
use App\Notifications\PaymentReceiptUploadedNotification;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Database\Events\TransactionBeginning;
use Illuminate\Database\Events\TransactionCommitted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Mail;
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
    Mail::fake();

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

it('keeps an item added immediately after the order commits in the next cart', function () {
    Notification::fake();
    Mail::fake();
    $cart = Cart::factory()->for($this->user)->create();
    $ordered = CartItem::factory()->for($cart)->create();
    $level = DB::transactionLevel();
    $nextVariant = ProductVariant::factory()->create();
    $submitted = false;

    Event::listen(TransactionCommitted::class, function (TransactionCommitted $event) use ($level, $nextVariant, &$submitted): void {
        if (! $submitted && $event->connection->transactionLevel() === $level) {
            $submitted = true;
            $nextCart = Cart::firstOrCreate(['user_id' => $this->user->id]);
            CartItem::factory()->for($nextCart)->for($nextVariant, 'productVariant')->create();
        }
    });

    $response = $this->actingAs($this->user)->post(route('checkout.process'));
    $order = Order::sole();
    $response->assertRedirect(route('checkout.npr', $order));

    expect($order->items()->sole()->product_variant_id)->toBe($ordered->product_variant_id);
    $this->assertDatabaseHas('cart_items', ['product_variant_id' => $nextVariant->id]);
});

it('keeps the cart for review when its contents change before the order transaction', function (string $change) {
    $cart = Cart::factory()->for($this->user)->create();
    $item = CartItem::factory()->for($cart)->create(['quantity' => 1]);

    Event::listen(TransactionBeginning::class, function () use ($change, $cart, $item): void {
        if ($change === 'new line') {
            CartItem::factory()->for($cart)->create();
        } else {
            $item->increment('quantity');
        }
    });

    $this->actingAs($this->user)->post(route('checkout.process'))
        ->assertRedirect(route('cart.index'))
        ->assertSessionHas('inertia.flash_data.toast.message', 'Your cart changed during checkout. Review it and try again.');

    $this->assertDatabaseCount('orders', 0);
    if ($change === 'new line') {
        expect($cart->items()->count())->toBe(2);
    } else {
        expect($item->fresh()->quantity)->toBe(2);
    }
})->with(['new line', 'quantity']);

it('places one order when two checkout requests have read the same cart', function () {
    Notification::fake();
    Mail::fake();
    $cart = Cart::factory()->for($this->user)->create();
    CartItem::factory()->for($cart)->create();
    $checkoutLevel = DB::transactionLevel() + 1;

    // The first request has read the cart. Let the other tab finish checkout
    // before the first request takes the owner lock and rechecks those lines.
    Event::listen(TransactionBeginning::class, function (TransactionBeginning $event) use ($checkoutLevel): void {
        if ($event->connection->transactionLevel() === $checkoutLevel) {
            $response = $this->post(route('checkout.process'), ['additional_data' => 'Second tab']);
            $response->assertRedirect(route('checkout.npr', Order::sole()));
        }
    });

    $this->actingAs($this->user)->post(route('checkout.process'), ['additional_data' => 'First tab'])
        ->assertRedirect(route('cart.index'))
        ->assertSessionHas('inertia.flash_data.toast.message', 'Your cart changed during checkout. Review it and try again.');

    expect(Order::sole()->additional_data)->toBe(['note' => 'Second tab']);
    Notification::assertSentToTimes($this->admin, OrderPlacedNotification::class, 1);
});

it('requires a fresh checkout when a variant price changes after the cart is read', function (string $column, float $price, float $cost) {
    $variant = ProductVariant::factory()->create(['price_npr' => 100, 'purchase_price_npr' => 60]);
    $cart = Cart::factory()->for($this->user)->create();
    $item = CartItem::factory()->for($cart)->for($variant, 'productVariant')->create(['quantity' => 2]);

    Event::listen(TransactionBeginning::class, function () use ($variant, $column, $price, $cost): void {
        $variant->update([$column => $column === 'price_npr' ? $price : $cost]);
    });

    $this->actingAs($this->user)->post(route('checkout.process'))
        ->assertRedirect(route('cart.index'))
        ->assertSessionHas('inertia.flash_data.toast.message', 'Your cart changed during checkout. Review it and try again.');
    $this->assertDatabaseCount('orders', 0);
    $this->assertModelExists($item);

    $response = $this->post(route('checkout.process'));
    $order = Order::sole();
    $response->assertRedirect(route('checkout.npr', $order));
    $line = $order->items()->sole();
    expect($line->price)->toBe($price)
        ->and($line->purchase_price)->toBe($cost)
        ->and($order->total_amount)->toBe($price * 2);
})->with([
    'selling price' => ['price_npr', 100.01, 60.00],
    'purchase price' => ['purchase_price_npr', 100.00, 60.01],
]);

it('refuses the order when a product goes out of stock after the cart was checked', function () {
    Notification::fake();
    Mail::fake();

    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    $item = CartItem::factory()->create(['cart_id' => $cart->id]);
    $product = $item->productVariant->product;

    // Stand in for an admin pulling the product between the early cart check
    // and the order transaction.
    Event::listen(TransactionBeginning::class, function () use ($product): void {
        $product->update(['in_stock' => false]);
    });

    $this->actingAs($this->user)
        ->post('/checkout', ['additional_data' => 'test note'])
        ->assertRedirect(route('cart.index'))
        ->assertSessionHas('inertia.flash_data.toast.type', 'error');

    expect(Order::query()->count())->toBe(0);
    $this->assertDatabaseHas('carts', ['id' => $cart->id]);
    Notification::assertNothingSent();
});

it('sends the shopper back to the cart when a product is deleted while the cart loads', function (string $deletedRelation) {
    Notification::fake();
    Mail::fake();

    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    $item = CartItem::factory()->create(['cart_id' => $cart->id]);
    $variant = $item->productVariant;

    // Stand in for an admin deleting the row after the cart items were read
    // but before the eager load reaches the variant or product query.
    $deleted = false;
    DB::listen(function (QueryExecuted $query) use (&$deleted, $deletedRelation, $variant): void {
        if ($deleted || ! str_contains($query->sql, 'from "cart_items"')) {
            return;
        }

        $deleted = true;
        $deletedRelation === 'variant' ? $variant->delete() : $variant->product->delete();
    });

    $this->actingAs($this->user)
        ->post('/checkout', ['additional_data' => 'test note'])
        ->assertRedirect(route('cart.index'))
        ->assertSessionHas('inertia.flash_data.toast.type', 'error');

    expect($deleted)->toBeTrue()
        ->and(Order::query()->count())->toBe(0);
})->with(['variant', 'product']);

it('refuses checkout when a selected variant is deleted after the cart loads', function () {
    $cart = Cart::factory()->for($this->user)->create();
    $item = CartItem::factory()->for($cart)->create();
    $variant = $item->productVariant;

    Event::listen(TransactionBeginning::class, function () use ($variant): void {
        $variant->delete();
    });

    $this->actingAs($this->user)->post(route('checkout.process'))
        ->assertRedirect(route('cart.index'))
        ->assertSessionHas('inertia.flash_data.toast.type', 'error');

    $this->assertDatabaseHas('products', ['id' => $variant->product_id]);
    $this->assertDatabaseCount('orders', 0);
    $this->assertModelExists($cart);
});

it('queues an order email to the shop when an order is placed', function () {
    Notification::fake();
    Mail::fake();

    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id]);

    $this->actingAs($this->user)->post('/checkout', [
        'additional_data' => 'test note',
    ]);

    $order = Order::first();

    // Queued, not sent: the SMTP round-trip must stay off the checkout request.
    Mail::assertQueued(OrderPlaced::class, function (OrderPlaced $mail) use ($order) {
        return $mail->order->is($order)
            && $mail->hasTo(config('mail.order_notification_address'));
    });

    Mail::assertNotSent(OrderPlaced::class);
});

it('completes checkout without the shop email when no shop inbox is configured', function () {
    Notification::fake();
    Mail::fake();

    // The address has no default in config — a public repo must not carry the
    // shop's inbox — so an unset one must not take checkout down with it.
    config(['mail.order_notification_address' => null]);

    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id]);

    $response = $this->actingAs($this->user)->post('/checkout');

    $order = Order::first();

    expect($order)->not->toBeNull();
    $response->assertRedirect(route('checkout.npr', $order));

    // Only the shop's half is gated on the shop inbox; the customer is still
    // told about their own order.
    Mail::assertNotQueued(OrderPlaced::class);
});

it('renders the order email', function () {
    $cart = Cart::factory()->create(['user_id' => $this->user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id]);

    $this->actingAs($this->user)->post('/checkout');

    $order = Order::first()->load('items.productVariant.product');
    $item = $order->items->first();

    /*
     * Rendered for real rather than faked: the mail is built on the worker, where
     * a broken view would surface as a failed job long after checkout succeeded.
     */
    $rendered = (new OrderPlaced($order))->render();

    expect($rendered)
        ->toContain($order->order_number)
        ->toContain($this->user->email)
        // The line item, which is what walks productVariant.product.
        ->toContain($item->productVariant->product->name)
        ->toContain($item->productVariant->name);
});

it('can view NPR payment page', function () {
    $order = Order::factory()->create([
        'user_id' => $this->user->id,
        'status' => 'pending',
    ]);

    $response = $this->actingAs($this->user)->get('/checkout/'.$order->uuid.'/npr');

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

    $response = $this->actingAs($this->user)->post('/checkout/'.$order->uuid.'/npr', [
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

    $response = $this->actingAs($this->user)->post('/checkout/'.$order->uuid.'/npr', [
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

    $response = $this->actingAs($this->user)->post('/checkout/'.$order->uuid.'/npr', [
        'receipt' => $file,
    ]);

    $response->assertRedirect(route('orders.show', $order));
    $response->assertSessionHas('error', 'Receipt already uploaded.');
});
