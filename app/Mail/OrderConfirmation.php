<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Confirms an order to the customer who placed it.
 *
 * The shop's own copy of this news is App\Mail\OrderPlaced. They are separate
 * mailables because they go to different people, on different transports, saying
 * different things — the shop needs a link into the admin panel, the customer
 * needs a receipt.
 */
class OrderConfirmation extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @var array<int, int>
     */
    public array $backoff = [30, 120];

    public function __construct(
        public Order $order,
    ) {}

    public function envelope(): Envelope
    {
        $from = config('mail.customer_from.address');

        return new Envelope(
            /*
             * From our own domain, not the shop's Gmail: the message is only
             * verifiable as ours if it is sent from a domain we authenticated.
             * Falls back to the global from address when unconfigured, so this is
             * never a hard failure.
             */
            from: filled($from)
                ? new Address($from, (string) config('mail.customer_from.name'))
                : null,
            subject: "Your order {$this->order->order_number}",
        );
    }

    public function content(): Content
    {
        // Same relations the shop's copy walks; see OrderPlaced for why
        // serviceEngagements is not optional.
        $this->order->loadMissing([
            'user',
            'items.productVariant.product',
            'items.serviceEngagements',
            'shipment',
        ]);

        return new Content(
            markdown: 'emails.orders.confirmation',

            /*
             * A hand-written plain-text part, rather than the one Laravel derives
             * from the markdown. That derivation emits the markdown source, so a
             * text-only client is shown a pipe table — complete with the backslash
             * escapes that only ever existed to keep the HTML table intact.
             */
            text: 'emails.orders.confirmation_text',

            with: [
                'total' => $this->order->displayTotalNpr(),
                'orderUrl' => route('orders.show', $this->order),
            ],
        );
    }
}
