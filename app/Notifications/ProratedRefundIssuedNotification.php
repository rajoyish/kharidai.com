<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Tells the customer a prorated refund was sent back to them. Carries plain data,
 * not the Order it was built from. See OrderPlacedNotification for why.
 */
class ProratedRefundIssuedNotification extends Notification
{
    use Queueable;

    public int $orderId;

    /** The order's URL key; null only on notifications queued before it existed. */
    public ?string $orderUuid = null;

    public string $orderNumber;

    public float $refundAmount;

    public function __construct(Order $order)
    {
        $this->orderId = $order->id;
        $this->orderUuid = $order->uuid;
        $this->orderNumber = $order->order_number;
        $this->refundAmount = $order->refundedNpr();
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload());
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return $this->payload();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return [
            'message' => 'Prorated Refund Issued',
            'description' => 'A prorated refund of Rs. '.number_format($this->refundAmount, 2).' was issued for order #'.$this->orderNumber.'.',
            'url' => route('orders.show', $this->orderUuid ?? $this->orderId),
            'order_id' => $this->orderId,
        ];
    }
}
