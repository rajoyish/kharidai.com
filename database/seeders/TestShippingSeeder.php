<?php

namespace Database\Seeders;

use App\Models\PhysicalProductDetail;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ShippingRate;
use App\Models\ShippingZone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TestShippingSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create a Shipping Zone with a Parcel Capacity
        $zone = ShippingZone::create([
            'name' => 'Test Zone (5kg Capacity)',
            'is_active' => true,
            'sort_order' => 10,
        ]);

        ShippingRate::create([
            'shipping_zone_id' => $zone->id,
            'base_fee_npr' => 150, // Base fee per parcel
            'per_kg_fee_npr' => 50, // Fee per kg
            'parcel_capacity_kg' => 5.0, // Max 5kg per parcel
            'free_over_npr' => 20000, // Free shipping if subtotal > 20k
            'min_days' => 2,
            'max_days' => 4,
        ]);

        // 2. Light combinable item (0.5kg)
        $p1 = Product::create(['type' => 'physical', 'title' => 'Light T-Shirt', 'slug' => Str::slug('Light T-Shirt '.Str::random(4)), 'is_visible' => true, 'in_stock' => true]);
        PhysicalProductDetail::create(['product_id' => $p1->id, 'weight_kg' => 0.5, 'free_shipping' => false]);
        ProductVariant::create(['product_id' => $p1->id, 'name' => 'Default', 'price_npr' => 1000, 'weight_kg' => 0.5, 'ships_individually' => false]);

        // 3. Bulky item (always ships individually, 8kg)
        $p2 = Product::create(['type' => 'physical', 'title' => 'Gaming Monitor', 'slug' => Str::slug('Gaming Monitor '.Str::random(4)), 'is_visible' => true, 'in_stock' => true]);
        PhysicalProductDetail::create(['product_id' => $p2->id, 'weight_kg' => 8.0, 'free_shipping' => false]);
        ProductVariant::create(['product_id' => $p2->id, 'name' => 'Default', 'price_npr' => 25000, 'weight_kg' => 8.0, 'ships_individually' => true]);

        // 4. Flat Shipping item
        $p3 = Product::create(['type' => 'physical', 'title' => 'Flat Rate Sticker', 'slug' => Str::slug('Flat Rate Sticker '.Str::random(4)), 'is_visible' => true, 'in_stock' => true]);
        PhysicalProductDetail::create(['product_id' => $p3->id, 'weight_kg' => 0.1, 'flat_shipping_npr' => 25, 'free_shipping' => false]);
        ProductVariant::create(['product_id' => $p3->id, 'name' => 'Default', 'price_npr' => 100, 'weight_kg' => 0.1, 'ships_individually' => false]);

        // 5. Free Shipping item
        $p4 = Product::create(['type' => 'physical', 'title' => 'Digital Gift Card (Physical)', 'slug' => Str::slug('Gift Card '.Str::random(4)), 'is_visible' => true, 'in_stock' => true]);
        PhysicalProductDetail::create(['product_id' => $p4->id, 'weight_kg' => 0.05, 'free_shipping' => true]);
        ProductVariant::create(['product_id' => $p4->id, 'name' => 'Default', 'price_npr' => 5000, 'weight_kg' => 0.05, 'ships_individually' => false]);
    }
}
