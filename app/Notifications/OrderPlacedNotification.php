<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;
use App\Models\Order;

class OrderPlacedNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order)
    {
    }

    public function via($notifiable)
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage([
            'message' => 'New Order #' . $this->order->order_number,
            'description' => 'A new order has been placed for ' . $this->order->currency . ' ' . number_format($this->order->total_amount, 2),
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ]);
    }

    public function toArray($notifiable)
    {
        return [
            'message' => 'New Order #' . $this->order->order_number,
            'description' => 'A new order has been placed for ' . $this->order->currency . ' ' . number_format($this->order->total_amount, 2),
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ];
    }
}
