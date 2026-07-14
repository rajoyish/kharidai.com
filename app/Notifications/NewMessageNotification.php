<?php

namespace App\Notifications;

use App\Models\OrderMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Carries plain data, not the OrderMessage it was built from. See
 * OrderPlacedNotification for why: a queued model is re-fetched when the job runs,
 * and a record deleted in the meantime kills the job rather than letting it quietly
 * give up.
 *
 * The link still varies by recipient — an admin goes to the back office, a customer
 * to their own order — so that is decided per notifiable rather than snapshotted.
 */
class NewMessageNotification extends Notification
{
    use Queueable;

    public int $orderId;

    public string $senderName;

    public string $excerpt;

    public function __construct(OrderMessage $message)
    {
        // Eager-loaded rather than read through the relation: the sender is needed
        // now, while the record is certainly still here.
        $message->loadMissing('user');

        $this->orderId = $message->order_id;
        $this->senderName = $message->user->is_admin ? 'Support Admin' : $message->user->name;
        $this->excerpt = (string) str($message->message)->limit(50);
    }

    /**
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['broadcast', 'database'];
    }

    public function toBroadcast(User $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload($notifiable));
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(User $notifiable): array
    {
        return $this->payload($notifiable);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(User $notifiable): array
    {
        return [
            'message' => 'New Message from '.$this->senderName,
            'description' => $this->excerpt,
            'url' => $notifiable->is_admin
                ? route('admin.orders.show', $this->orderId)
                : route('orders.show', $this->orderId),
            'order_id' => $this->orderId,
        ];
    }
}
