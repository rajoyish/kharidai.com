<?php

namespace Database\Seeders;

use App\Actions\Tithes\CalculateMonthlyProfitAction;
use App\Actions\Tithes\SyncMonthlyTitheAction;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Gallery;
use App\Models\Media;
use App\Models\MonthlyTithe;
use App\Models\Order;
use App\Models\OrderCredential;
use App\Models\OrderMessage;
use App\Models\PaymentReceipt;
use App\Models\Product;
use App\Models\Subscription;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class MiscSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $products = Product::with('variants')->get();
        // `items` is read per order below (step 4); eager load it so the loop
        // doesn't trip the global lazy-loading guard with an N+1.
        $orders = Order::with('items')->get();

        if ($users->isEmpty() || $products->isEmpty() || $orders->isEmpty()) {
            return;
        }

        // 1. Carts and CartItems
        foreach ($users->take(5) as $user) {
            $cart = Cart::firstOrCreate(['user_id' => $user->id]);

            $variant = $products->random()->variants->first();
            if ($variant) {
                CartItem::firstOrCreate([
                    'cart_id' => $cart->id,
                    'product_variant_id' => $variant->id,
                ], [
                    'quantity' => rand(1, 3),
                ]);
            }
        }

        // 2. Gallery and Media
        foreach ($products->take(10) as $product) {
            Gallery::create([
                'product_id' => $product->id,
                'image_path' => 'products/'.Str::random(10).'.jpg',
                'sort_order' => 1,
            ]);

            Media::create([
                'file_name' => 'sample_'.$product->id.'.jpg',
                'file_path' => 'media/sample_'.$product->id.'.jpg',
                'url' => 'https://example.com/media/sample_'.$product->id.'.jpg',
                'disk' => 'public',
            ]);
        }

        // 3. MonthlyTithe — derived from the profit of the seeded completed orders
        // rather than invented, so the breakdown on /admin/tithes adds up.
        $this->seedMonthlyTithes();

        // 4. OrderCredential, OrderMessage, PaymentReceipt, Subscription
        $admin = User::where('is_admin', true)->first();

        foreach ($orders->take(10) as $order) {
            // Credential (simulating digital product delivery)
            OrderCredential::create([
                'order_id' => $order->id,
                'content' => "Username: user_{$order->id}\nPassword: ".Str::random(8),
            ]);

            // Message
            OrderMessage::create([
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'message' => 'Please deliver this as soon as possible. Thank you!',
            ]);

            if ($admin) {
                OrderMessage::create([
                    'order_id' => $order->id,
                    'user_id' => $admin->id,
                    'message' => 'We are processing your order right now.',
                ]);
            }

            // Receipt
            PaymentReceipt::create([
                'order_id' => $order->id,
                'file_path' => 'receipts/receipt_'.$order->id.'.pdf',
                'status' => 'verified',
            ]);

            // Subscription (simulating subscription based product)
            $item = $order->items->first();
            if ($item) {
                Subscription::create([
                    'order_id' => $order->id,
                    'user_id' => $order->user_id,
                    'order_item_id' => $item->id,
                    'start_date' => now()->toDateString(),
                    'end_date' => now()->addDays(30)->toDateString(),
                ]);
            }
        }
    }

    /**
     * Recalculate a tithe for every month that has completed orders, then settle
     * the months that have already closed so the dashboard shows both a collected
     * and a pending figure.
     */
    private function seedMonthlyTithes(): void
    {
        $calculateMonthlyProfit = app(CalculateMonthlyProfitAction::class);
        $syncMonthlyTithe = app(SyncMonthlyTitheAction::class);
        $currentMonth = CarbonImmutable::now()->startOfMonth();

        foreach ($calculateMonthlyProfit->monthsWithCompletedOrders() as ['year' => $year, 'month' => $month]) {
            $syncMonthlyTithe->execute(CarbonImmutable::create($year, $month, 1));
        }

        MonthlyTithe::query()
            ->get()
            ->filter(fn (MonthlyTithe $monthlyTithe): bool => CarbonImmutable::create($monthlyTithe->year, $monthlyTithe->month, 1)->lessThan($currentMonth))
            ->each(fn (MonthlyTithe $monthlyTithe) => $monthlyTithe->update([
                'is_paid' => true,
                'paid_at' => now(),
            ]));
    }
}
