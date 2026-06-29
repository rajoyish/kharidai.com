<?php

use App\Models\Order;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('orders.{orderId}', function ($user, $orderId) {
    $order = Order::find($orderId);

    return $order && ((int) $user->id === (int) $order->user_id || $user->is_admin) ? ['id' => $user->id, 'is_admin' => $user->is_admin] : false;
});

Broadcast::channel('support', function ($user) {
    return ['id' => $user->id, 'is_admin' => $user->is_admin];
});
