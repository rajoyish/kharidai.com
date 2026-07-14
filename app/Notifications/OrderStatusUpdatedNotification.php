<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Carries plain data, not the Order it was built from. See OrderPlacedNotification
 * for why: a queued model is re-fetched when the job runs, and an order deleted in
 * the meantime kills the job rather than letting it quietly give up.
 */
class OrderStatusUpdatedNotification extends Notification
{
    use Queueable;

    public int $orderId;

    public string $orderNumber;

    public function __construct(Order $order, public string $status)
    {
        $this->orderId = $order->id;
        $this->orderNumber = $order->order_number;
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
            'message' => 'Order Status Updated',
            'description' => 'Your order #'.$this->orderNumber.' is now '.$this->status.'.',
            'url' => route('orders.show', $this->orderId),
            'order_id' => $this->orderId,
        ];
    }
}
