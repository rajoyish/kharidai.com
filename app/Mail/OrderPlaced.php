<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Tells the shop that a customer has placed an order.
 *
 * Queued rather than sent inline: an SMTP handshake and send costs hundreds of
 * milliseconds to several seconds, and the customer must never wait on it to
 * reach their confirmation page. Queueing pushes the send onto Redis in about a
 * millisecond; the cron-driven worker delivers it moments later.
 */
class OrderPlaced extends Mailable implements ShouldQueue
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
        return new Envelope(
            subject: "New order {$this->order->order_number}",
        );
    }

    public function content(): Content
    {
        /*
         * Eager-load what the view and displayTotalNpr() walk, so the mail costs a
         * fixed handful of queries rather than one per line item.
         *
         * serviceEngagements is not decoration: displayTotalNpr() sums each item's
         * revenueNpr(), which reads the item's engagements to decide whether an
         * invoiced grand total supersedes the snapshot price. Omitting it makes a
         * service order's email throw a LazyLoadingViolationException outright.
         */
        $this->order->loadMissing([
            'user',
            'items.productVariant.product',
            'items.serviceEngagements',
            'shipment',
        ]);

        return new Content(
            markdown: 'emails.orders.placed',

            // See OrderConfirmation: the derived text part emits raw markdown.
            text: 'emails.orders.placed_text',

            with: [
                /*
                 * The total the customer actually owes, which for service items
                 * with a saved invoice differs from the snapshot total_amount.
                 */
                'total' => $this->order->displayTotalNpr(),
                'adminUrl' => route('admin.orders.show', $this->order->id),
            ],
        );
    }
}
