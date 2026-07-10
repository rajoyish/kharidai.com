<?php

namespace Database\Seeders;

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\PaymentOption;
use App\Enums\ProductType;
use App\Models\Order;
use App\Models\Product;
use App\Models\Shipment;
use App\Models\ShippingAddress;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class OrderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $physicalProducts = Product::where('type', ProductType::Physical)->with('variants')->get();
        $digitalProducts = Product::where('type', ProductType::Digital)->with('variants')->get();
        $serviceProducts = Product::where('type', ProductType::Service)->with('variants')->get();

        if ($users->isEmpty()) {
            return;
        }

        // Seed 30 mixed orders
        for ($i = 0; $i < 30; $i++) {
            $user = $users->random();
            $type = rand(1, 3);

            $product = null;
            if ($type === 1) {
                $product = $physicalProducts->random();
            }
            if ($type === 2) {
                $product = $serviceProducts->random();
            }
            if ($type === 3) {
                $product = $digitalProducts->random();
            }

            if (! $product || $product->variants->isEmpty()) {
                continue;
            }

            $variant = $product->variants->random();
            $qty = rand(1, 3);
            $itemTotal = $variant->price_npr * $qty;
            $shippingTotal = $type === 1 ? 200 : 0;
            $total = $itemTotal + $shippingTotal;

            $status = ['pending', 'processing', 'completed', 'cancelled'][rand(0, 3)];

            $order = Order::create([
                'order_number' => 'ORD-'.strtoupper(Str::random(10)),
                'user_id' => $user->id,
                'status' => $status,
                'total_amount' => $total,
                'items_total' => $itemTotal,
                'shipping_total' => $shippingTotal,
                'amount_due_now' => $total,
                'balance_due' => 0,
                'payment_option' => PaymentOption::Full,
            ]);

            $item = $order->items()->create([
                'product_variant_id' => $variant->id,
                'price' => $variant->price_npr,
                'purchase_price' => $variant->purchase_price_npr ?? $variant->price_npr * 0.6,
                'quantity' => $qty,
                'brief' => $type === 2 ? ['requirements' => 'Sample requirements for order '.$order->id, 'examples' => 'example.com'] : null,
            ]);

            if ($type === 1) { // Physical
                $streets = ['New Road', 'Durbar Marg', 'Thamel', 'Baneshwor', 'Patan Dhoka', 'Jhamsikhel'];
                $address = ShippingAddress::create([
                    'user_id' => $user->id,
                    'recipient_name' => $user->name,
                    'mobile_number' => '98'.rand(10000000, 99999999),
                    'address_line' => rand(10, 999).' '.$streets[array_rand($streets)],
                    'city' => 'Kathmandu',
                    'shipping_zone_id' => 1,
                ]);

                $order->update(['shipping_address_id' => $address->id]);

                $shipmentStatus = ['pending', 'packed', 'shipped', 'delivered'][rand(0, 3)];

                Shipment::create([
                    'order_id' => $order->id,
                    'status' => $shipmentStatus,
                    'recipient_name' => $user->name,
                    'mobile_number' => $address->mobile_number,
                    'address_line' => $address->address_line,
                    'city' => $address->city,
                    'zone_name' => 'Kathmandu Valley',
                    'tracking_note' => $shipmentStatus === 'shipped' ? 'On the way' : null,
                ]);
            } elseif ($type === 2) { // Service
                $engagementStatus = EngagementStatus::cases()[array_rand(EngagementStatus::cases())];

                $item->serviceEngagements()->create([
                    'user_id' => $user->id,
                    'source' => EngagementSource::Storefront,
                    'status' => $engagementStatus,
                    'price_npr' => $variant->price_npr,
                    'purchase_price_npr' => $variant->purchase_price_npr ?? $variant->price_npr * 0.4,
                    'advance_required_npr' => 0,
                    'advance_paid_npr' => 0,
                    'project_name' => $product->title,
                    'line_items' => [
                        ['label' => 'Standard Service', 'quantity' => 1, 'unit_price_npr' => $variant->price_npr],
                    ],
                    'tax_rate' => 13.00,
                    'project_completion_date' => $engagementStatus === EngagementStatus::Completed ? now() : null,
                ]);
            }
        }
    }
}
