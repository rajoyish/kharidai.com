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
            'message' => 'Order Status Updated',
            'description' => 'Your order #'.$this->order->order_number.' is now '.$this->status.'.',
            'url' => route('orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'message' => 'Order Status Updated',
            'description' => 'Your order #'.$this->order->order_number.' is now '.$this->status.'.',
            'url' => route('orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ];
    }
}
