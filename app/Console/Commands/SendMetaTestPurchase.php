<?php

namespace App\Console\Commands;

use App\Jobs\SendMetaPurchaseEvent;
use App\Models\Order;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('meta:test-purchase {order? : Order id to report; defaults to the most recent completed order}')]
#[Description('Send a real Purchase event to Meta\'s Conversions API, to verify the integration end to end.')]
class SendMetaTestPurchase extends Command
{
    public function handle(): int
    {
        if (blank(config('services.meta.conversions_api_token'))) {
            $this->error('META_CONVERSIONS_API_TOKEN is not set — the job would silently do nothing.');

            return self::FAILURE;
        }

        $order = $this->argument('order') !== null
            ? Order::find($this->argument('order'))
            : Order::completed()->latest()->first();

        if ($order === null) {
            $this->error('No order found to report. Pass an order id, or complete an order first.');

            return self::FAILURE;
        }

        $testEventCode = config('services.meta.test_event_code');

        if (blank($testEventCode)) {
            $this->warn('META_TEST_EVENT_CODE is empty — this will hit your LIVE dataset, not Test Events.');

            if (! $this->confirm('Send to the live dataset anyway?', default: false)) {
                return self::FAILURE;
            }
        } else {
            $this->line("Sending with test_event_code <info>{$testEventCode}</info> — this lands in Test Events, not the live dataset.");
        }

        $this->line("Reporting order <info>{$order->order_number}</info> (NPR {$order->displayTotalNpr()}) to Meta…");

        // Synchronous on purpose: the point of this command is to see the API's
        // answer, which an after-response dispatch would swallow.
        SendMetaPurchaseEvent::dispatchSync($order->id);

        $this->info('Event sent. Check Events Manager → Test Events; it should appear within seconds.');

        return self::SUCCESS;
    }
}
