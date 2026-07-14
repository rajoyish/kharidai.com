<?php

namespace App\Console\Commands;

use App\Mail\OrderConfirmation;
use App\Mail\OrderPlaced;
use App\Models\Order;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;
use Throwable;

#[Signature('mail:test-order
    {order? : Order id to send; defaults to the most recent order}
    {--customer : Send the customer\'s confirmation on the customer mailer, instead of the shop\'s alert on the shop mailer}')]
#[Description('Send an order email now, to verify a mail transport end to end.')]
class SendTestOrderEmail extends Command
{
    public function handle(): int
    {
        $order = $this->argument('order') !== null
            ? Order::find($this->argument('order'))
            : Order::latest('id')->first();

        if ($order === null) {
            $this->error('No order found to send. Pass an order id, or place an order first.');

            return self::FAILURE;
        }

        return $this->option('customer')
            ? $this->sendCustomerConfirmation($order)
            : $this->sendShopAlert($order);
    }

    /**
     * The shop's own alert, on the shop's mailer — the Gmail path.
     */
    private function sendShopAlert(Order $order): int
    {
        $recipient = config('mail.order_notification_address');

        if (blank($recipient)) {
            $this->error('MAIL_ORDER_NOTIFICATION_ADDRESS is not set — there is no inbox to notify.');

            return self::FAILURE;
        }

        return $this->deliver(
            new OrderPlaced($order),
            $recipient,
            config('mail.shop_mailer') ?? config('mail.default'),
            $order,
        );
    }

    /**
     * The customer's confirmation, on the customer mailer — the Brevo path.
     *
     * Sent to the address on the order, not to an arbitrary one: a transport test
     * that does not exercise the real recipient is not much of a test.
     */
    private function sendCustomerConfirmation(Order $order): int
    {
        $mailer = config('mail.customer_mailer');

        if (blank($mailer)) {
            $this->error('MAIL_CUSTOMER_MAILER is not set — customer mail is switched off.');
            $this->line('Set it to `brevo` once the transactional provider is configured.');

            return self::FAILURE;
        }

        $recipient = $order->user->email;

        if (blank($recipient)) {
            $this->error("Order {$order->order_number} has no customer email address.");

            return self::FAILURE;
        }

        return $this->deliver(new OrderConfirmation($order), $recipient, $mailer, $order);
    }

    private function deliver(Mailable $mailable, string $recipient, string $mailer, Order $order): int
    {
        if ($mailer === 'log') {
            $this->warn('This mailer is `log` — it writes to storage/logs/laravel.log and sends nothing.');
        }

        $this->line("Sending order <info>{$order->order_number}</info> to <info>{$recipient}</info> via <info>{$mailer}</info>…");

        try {
            /*
             * sendNow, not send: both mailables are ShouldQueue, so send() would
             * merely push onto the queue and report success without ever touching
             * the provider — the opposite of what this command is for. sendNow
             * forces the SMTP round-trip here, so a rejection (bad key, unverified
             * sender, quota exhausted) surfaces as an exception we can show.
             */
            Mail::mailer($mailer)->to($recipient)->sendNow($mailable);
        } catch (Throwable $e) {
            $this->error('Delivery failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info($mailer === 'log'
            ? 'Written to storage/logs/laravel.log.'
            : "Sent. It should land in {$recipient} within seconds.");

        return self::SUCCESS;
    }
}
