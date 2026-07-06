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
            'message' => 'Payment Receipt Uploaded',
            'description' => 'Customer uploaded a receipt for order #'.$this->order->order_number,
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
            'message' => 'Payment Receipt Uploaded',
            'description' => 'Customer uploaded a receipt for order #'.$this->order->order_number,
            'url' => route('admin.orders.show', $this->order->id),
            'order_id' => $this->order->id,
        ];
    }
}
