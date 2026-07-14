<?php

use App\Mail\OrderConfirmation;
use App\Mail\OrderPlaced;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create(['email' => 'buyer@example.test']);

    Notification::fake();
    Mail::fake();
});

function placeAnOrder(User $user): void
{
    $cart = Cart::factory()->create(['user_id' => $user->id]);
    CartItem::factory()->create(['cart_id' => $cart->id]);

    test()->actingAs($user)->post('/checkout');
}

it('emails the customer a confirmation of their own order', function () {
    placeAnOrder($this->user);

    $order = Order::first();

    Mail::assertQueued(OrderConfirmation::class, function (OrderConfirmation $mail) use ($order) {
        return $mail->order->is($order)
            && $mail->hasTo('buyer@example.test');
    });
});

it('sends the shop and the customer emails on different mailers', function () {
    config([
        'mail.shop_mailer' => 'gmail',
        'mail.customer_mailer' => 'brevo',
    ]);

    placeAnOrder($this->user);

    /*
     * The two must not share a transport. The shop's alert goes to the owner's own
     * inbox, where Gmail is fine; the customer's copy has to come from our
     * authenticated domain via a transactional provider, or it lands in spam.
     */
    Mail::assertQueued(OrderPlaced::class, fn (OrderPlaced $mail) => $mail->mailer === 'gmail');
    Mail::assertQueued(OrderConfirmation::class, fn (OrderConfirmation $mail) => $mail->mailer === 'brevo');
});

it('sends the customer nothing when no customer mailer is configured', function () {
    /*
     * Gated on purpose. With no transactional provider, the only way to reach the
     * customer would be the shop's Gmail — which lands in spam and risks the
     * account. Sending nothing is the correct behaviour, and checkout still works.
     */
    config(['mail.customer_mailer' => null]);

    placeAnOrder($this->user);

    Mail::assertNotQueued(OrderConfirmation::class);

    // The shop is still told; only the customer half is gated.
    Mail::assertQueued(OrderPlaced::class);
});

it('renders the customer email with the order and the logo', function () {
    placeAnOrder($this->user);

    $order = Order::first()->load('items.productVariant.product');
    $item = $order->items->first();

    $html = (new OrderConfirmation($order))->render();

    expect($html)
        ->toContain($order->order_number)
        ->toContain($item->displayName())
        // The shared layout's header, so the customer's copy is branded too.
        ->toContain('cid:logo')
        // A receipt, not an admin alert: it must not leak the back-office link.
        ->not->toContain('/admin/');
});

it('sends the customer email from our own domain', function () {
    placeAnOrder($this->user);

    $order = Order::first();

    Mail::assertQueued(OrderConfirmation::class, function (OrderConfirmation $mail) {
        return $mail->hasFrom('support@example.test');
    });
});
