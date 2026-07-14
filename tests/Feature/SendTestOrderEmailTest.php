<?php

use App\Mail\OrderConfirmation;
use App\Mail\OrderPlaced;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

it('sends the order email immediately rather than queueing it', function () {
    Mail::fake();

    $order = Order::factory()->create();

    $this->artisan('mail:test-order')->assertSuccessful();

    /*
     * Sent, not queued: the point of the command is to prove SMTP works, and a
     * queued mail would report success without ever reaching Gmail.
     */
    Mail::assertSent(OrderPlaced::class, function (OrderPlaced $mail) use ($order) {
        return $mail->order->is($order)
            && $mail->hasTo(config('mail.order_notification_address'));
    });

    Mail::assertNotQueued(OrderPlaced::class);
});

it('sends the order named by argument', function () {
    Mail::fake();

    Order::factory()->create();
    $target = Order::factory()->create();

    $this->artisan('mail:test-order', ['order' => $target->id])->assertSuccessful();

    Mail::assertSent(OrderPlaced::class, fn (OrderPlaced $mail) => $mail->order->is($target));
});

it('fails when no shop inbox is configured', function () {
    Mail::fake();

    Order::factory()->create();
    config(['mail.order_notification_address' => null]);

    $this->artisan('mail:test-order')->assertFailed();

    Mail::assertNothingSent();
});

it('sends the customer confirmation on the customer mailer with --customer', function () {
    Mail::fake();

    $user = User::factory()->create(['email' => 'buyer@example.test']);
    $order = Order::factory()->for($user)->create();

    config(['mail.customer_mailer' => 'brevo']);

    $this->artisan('mail:test-order', ['--customer' => true])->assertSuccessful();

    Mail::assertSent(
        OrderConfirmation::class,
        fn (OrderConfirmation $mail) => $mail->order->is($order)
            && $mail->hasTo('buyer@example.test'),
    );

    // The shop's alert is a different mailable on a different transport; testing
    // one must not send the other.
    Mail::assertNotSent(OrderPlaced::class);
});

it('fails --customer when no customer mailer is configured', function () {
    Mail::fake();

    Order::factory()->create();
    config(['mail.customer_mailer' => null]);

    $this->artisan('mail:test-order', ['--customer' => true])->assertFailed();

    Mail::assertNothingSent();
});

it('fails when there is no order to send', function () {
    Mail::fake();

    $this->artisan('mail:test-order')->assertFailed();

    Mail::assertNothingSent();
});
