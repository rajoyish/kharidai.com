<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;

class PocketsflowService
{
    protected string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.pocketsflow.key');
    }

    public function createOrderProduct(Order $order)
    {
        $response = Http::withToken($this->apiKey)
            ->post('https://api.pocketsflow.com/products', [
                'name' => 'Kharidai Order '.$order->order_number,
                'price' => (float) $order->total_amount,
                'description' => 'Payment for order '.$order->order_number,
                'published' => true,
            ]);

        if ($response->failed()) {
            throw new \Exception('Failed to create Pocketsflow product: '.$response->body());
        }

        return $response->json();
    }

    public function createCheckoutSession(string $productId, Order $order)
    {
        $response = Http::withToken($this->apiKey)
            ->post('https://api.pocketsflow.com/checkout/sessions', [
                'productId' => $productId,
                'successUrl' => route('checkout.usd.success', ['order' => $order->id]),
                'cancelUrl' => route('checkout.usd.cancel', ['order' => $order->id]),
                'customerEmail' => $order->user->email,
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                ],
            ]);

        if ($response->failed()) {
            throw new \Exception('Failed to create Pocketsflow checkout session: '.$response->body());
        }

        return $response->json();
    }
}
