<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PaymentReceiptUploadedNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via($notifiable)
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast($notifiable)
    {
        return new BroadcastMessage([
            'message' => 'Payment Receipt Uploaded',
            'description' => 'Customer uploaded a receipt for order #'.$this->order->order_number,
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ]);
    }

    public function toArray($notifiable)
    {
        return [
            'message' => 'Payment Receipt Uploaded',
            'description' => 'Customer uploaded a receipt for order #'.$this->order->order_number,
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ];
    }
}
