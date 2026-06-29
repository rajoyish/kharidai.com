<?php

namespace App\Notifications;

use App\Models\OrderMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class NewMessageNotification extends Notification
{
    use Queueable;

    public function __construct(public OrderMessage $message) {}

    public function via($notifiable)
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast($notifiable)
    {
        $sender = $this->message->user->is_admin ? 'Support Admin' : $this->message->user->name;
        $url = $notifiable->is_admin
            ? route('admin.orders.show', $this->message->order_id)
            : route('orders.show', $this->message->order_id);

        return new BroadcastMessage([
            'message' => 'New Message from '.$sender,
            'description' => str($this->message->message)->limit(50),
            'url' => $url,
            'order_id' => $this->message->order_id,
        ]);
    }

    public function toArray($notifiable)
    {
        $sender = $this->message->user->is_admin ? 'Support Admin' : $this->message->user->name;
        $url = $notifiable->is_admin
            ? route('admin.orders.show', $this->message->order_id)
            : route('orders.show', $this->message->order_id);

        return [
            'message' => 'New Message from '.$sender,
            'description' => str($this->message->message)->limit(50),
            'url' => $url,
            'order_id' => $this->message->order_id,
        ];
    }
}
