<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('orders.{orderId}', function ($user, $orderId) {
    $order = \App\Models\Order::find($orderId);
    if ($order && ((int) $user->id === (int) $order->user_id || $user->is_admin)) {
        return [
            'id' => $user->id,
            'is_admin' => $user->is_admin,
        ];
    }
});
