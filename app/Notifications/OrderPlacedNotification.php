<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Carries plain data, not the Order it was built from.
 *
 * The broadcast channel queues this notification, and a queued model is stored as
 * an id and re-fetched when the job finally runs. Delete the order in between — an
 * admin clearing out a test order — and the job dies with a ModelNotFoundException
 * rather than quietly giving up, because the broadcast event Laravel wraps this in
 * cannot be told to discard itself when its model is missing.
 *
 * Snapshotting the handful of values the payload needs removes the re-fetch, and
 * with it the failure mode. It also saves a query per broadcast.
 */
class OrderPlacedNotification extends Notification
{
    use Queueable;

    public int $orderId;

    public string $orderNumber;

    public float $totalAmount;

    public function __construct(Order $order)
    {
        $this->orderId = $order->id;
        $this->orderNumber = $order->order_number;
        $this->totalAmount = $order->total_amount;
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
            'message' => 'New Order #'.$this->orderNumber,
            'description' => 'A new order has been placed for Rs. '.number_format($this->totalAmount, 0),
            'url' => route('admin.orders.show', $this->orderId),
            'order_id' => $this->orderId,
        ];
    }
}
