<?php

namespace App\Console\Commands;

use App\Mail\OrderPlaced;
use App\Models\Order;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

#[Signature('mail:test-order {order? : Order id to send; defaults to the most recent order}')]
#[Description('Send the order-placed email now, to verify SMTP delivery end to end.')]
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

        $recipient = config('mail.order_notification_address');
        $mailer = config('mail.default');

        if (blank($recipient)) {
            $this->error('MAIL_ORDER_NOTIFICATION_ADDRESS is not set — there is no inbox to notify.');
            $this->line('Set it in .env to the shop address that should receive order emails.');

            return self::FAILURE;
        }

        if ($mailer === 'log') {
            $this->warn('MAIL_MAILER=log — this writes the email to storage/logs/laravel.log and sends nothing.');
            $this->warn('Set MAIL_MAILER=smtp to actually deliver it through Gmail.');
        } elseif ($mailer === 'smtp' && blank(config('mail.mailers.smtp.password'))) {
            $this->error('MAIL_PASSWORD is empty. Gmail needs a 16-character App Password:');
            $this->line('  https://myaccount.google.com/apppasswords');

            return self::FAILURE;
        }

        $this->line("Sending order <info>{$order->order_number}</info> to <info>{$recipient}</info> via <info>{$mailer}</info>…");

        try {
            /*
             * sendNow, not send: OrderPlaced is a ShouldQueue mailable, so send()
             * would merely push it onto the queue and report success without ever
             * touching Gmail — the opposite of what this command is for. sendNow
             * forces the SMTP round-trip here, so Gmail's rejection (bad App
             * Password, blocked sign-in) surfaces as an exception we can show.
             */
            Mail::to($recipient)->sendNow(new OrderPlaced($order));
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
