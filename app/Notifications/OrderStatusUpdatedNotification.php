<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class OrderStatusUpdatedNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order, public string $status) {}

    public function via($notifiable)
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage([
            'message' => 'Order Status Updated',
            'description' => 'Your order #'.$this->order->order_number.' is now '.$this->status.'.',
            'url' => route('orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ]);
    }

    public function toArray($notifiable)
    {
        return [
            'message' => 'Order Status Updated',
            'description' => 'Your order #'.$this->order->order_number.' is now '.$this->status.'.',
            'url' => route('orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ];
    }
}
