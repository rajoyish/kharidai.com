<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Reports a completed order to Meta's Conversions API as a Purchase event.
 *
 * This is the server-side twin of the browser pixel: ad-blockers and tracking
 * prevention drop a large share of browser-side Purchase events, and an order
 * completed by an admin in the back office has no customer browser session at all.
 *
 * No queue worker runs on this app, so OrderObserver dispatches this after the
 * response. It is written as a queueable job regardless, so that the day a worker
 * does exist, the dispatch call is the only thing that has to change.
 */
class SendMetaPurchaseEvent implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /**
     * @var array<int, int>
     */
    public array $backoff = [10, 60];

    /**
     * Takes the order's id rather than the Order itself: the job is serialized on
     * dispatch, and a model property would be re-fetched from the database on
     * every deserialize — a query paid even in environments with no API token,
     * where the job does nothing. With an id, an unconfigured environment costs
     * zero queries and a configured one loads the order exactly once, below.
     */
    public function __construct(
        private readonly int $orderId,
    ) {}

    public function handle(): void
    {
        $token = config('services.meta.conversions_api_token');
        $pixelId = config('services.meta.pixel_id');

        // Unconfigured: local, CI, or a server that never received the secret.
        // Sending nothing is the only correct behaviour — there is no partial event.
        if (blank($token) || blank($pixelId)) {
            return;
        }

        $order = Order::with(['user', 'items'])->find($this->orderId);

        // Deleted between completion and this job running.
        if ($order === null) {
            return;
        }

        $version = config('services.meta.graph_version');

        $payload = [
            'access_token' => $token,
            'data' => [$this->eventPayload($order)],
        ];

        $testEventCode = config('services.meta.test_event_code');

        if (filled($testEventCode)) {
            $payload['test_event_code'] = $testEventCode;
        }

        $response = Http::asJson()
            ->timeout(10)
            ->post("https://graph.facebook.com/{$version}/{$pixelId}/events", $payload);

        if ($response->failed()) {
            Log::warning('Meta Conversions API rejected a Purchase event.', [
                'order_id' => $order->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            $response->throw();
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function eventPayload(Order $order): array
    {
        return [
            'event_name' => 'Purchase',
            'event_time' => ($order->created_at ?? now())->getTimestamp(),

            /*
             * Meta deduplicates on event_id — both against the browser pixel and
             * against a repeat of this job. So an order toggled out of and back
             * into "completed" is not counted as a second purchase, within Meta's
             * 48-hour deduplication window.
             */
            'event_id' => "order-{$order->id}",

            'action_source' => 'website',
            'user_data' => $this->userData($order),
            'custom_data' => [
                'currency' => 'NPR',
                'value' => $order->displayTotalNpr(),
                'order_id' => $order->order_number,
                'content_type' => 'product',
                'num_items' => (int) $order->items->sum('quantity'),
                'contents' => $order->items->map(fn (OrderItem $item): array => [
                    'id' => (string) $item->product_variant_id,
                    'quantity' => (int) $item->quantity,
                    'item_price' => $item->revenueNpr(),
                ])->values()->all(),
            ],
        ];
    }

    /**
     * Meta requires customer identifiers SHA-256 hashed, and normalised (trimmed,
     * lowercased) before hashing, or their hash will not match ours.
     *
     * Deliberately absent: client_ip_address and client_user_agent. An order is
     * typically completed by an admin in the back office, so the request's IP and
     * user-agent belong to the admin, not the customer — sending them would
     * attribute the purchase to the wrong person.
     *
     * @return array<string, array<int, string>>
     */
    private function userData(Order $order): array
    {
        $userData = ['external_id' => [hash('sha256', (string) $order->user_id)]];

        $email = $order->user->email;

        if (filled($email)) {
            $userData['em'] = [hash('sha256', mb_strtolower(trim($email)))];
        }

        return $userData;
    }
}
