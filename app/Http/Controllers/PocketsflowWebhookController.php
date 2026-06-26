<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use App\Notifications\PaymentReceiptUploadedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class PocketsflowWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $webhookSecret = config('services.pocketsflow.webhook_secret');
        $payload = $request->getContent();
        $receivedSignature = $request->header('X-Pocketsflow-Signature', '');

        $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);

        if (! hash_equals($expectedSignature, $receivedSignature)) {
            Log::warning('Invalid Pocketsflow webhook signature.');

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $data = json_decode($payload, true);
        Log::info('Valid Pocketsflow webhook received: ', $data);

        // Based on typical webhook payloads and user instructions,
        // handle the 'Order completed' event.
        // We will try to find the order by metadata.order_id if available,
        // or potentially by tracking the custom productId we created.

        $orderId = null;

        // Extract metadata if available in standard payload structure
        if (isset($data['metadata']['order_id'])) {
            $orderId = $data['metadata']['order_id'];
        } elseif (isset($data['data']['metadata']['order_id'])) {
            $orderId = $data['data']['metadata']['order_id'];
        } elseif (isset($data['order']['metadata']['order_id'])) {
            $orderId = $data['order']['metadata']['order_id'];
        } elseif (isset($data['product']['name'])) {
            // Fallback: If metadata is not passed through, extract from the dynamic product name
            // "Kharidai Order ORD-..."
            if (preg_match('/Kharidai Order (ORD-[A-Z0-9]+)/', $data['product']['name'], $matches)) {
                $orderNumber = $matches[1];
                $order = Order::where('order_number', $orderNumber)->first();
                if ($order) {
                    $orderId = $order->id;
                }
            }
        }

        if ($orderId) {
            $order = Order::find($orderId);
            if ($order && $order->status === 'pending') {
                $order->update(['status' => 'delivering']);
                Log::info("Order {$order->id} marked as delivering via Pocketsflow webhook.");

                // Notify admins
                $admins = User::where('is_admin', true)->get();
                Notification::send($admins, new PaymentReceiptUploadedNotification($order));
            }
        } else {
            Log::warning('Pocketsflow webhook could not link to a local order.', $data);
        }

        return response()->json(['status' => 'success']);
    }
}
