<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class OrderPlacedNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'message' => 'New Order #'.$this->order->order_number,
            'description' => 'A new order has been placed for Rs. '.number_format($this->order->total_amount, 0),
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'New Order #'.$this->order->order_number,
            'description' => 'A new order has been placed for Rs. '.number_format($this->order->total_amount, 0),
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ];
    }
}
