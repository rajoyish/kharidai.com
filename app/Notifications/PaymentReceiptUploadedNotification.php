<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;
use App\Models\Order;

class PaymentReceiptUploadedNotification extends Notification
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
            'message' => 'Payment Receipt Uploaded',
            'description' => 'Customer uploaded a receipt for order #' . $this->order->order_number,
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ]);
    }

    public function toArray($notifiable)
    {
        return [
            'message' => 'Payment Receipt Uploaded',
            'description' => 'Customer uploaded a receipt for order #' . $this->order->order_number,
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ];
    }
}
