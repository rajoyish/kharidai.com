<?php

namespace Database\Seeders;

use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Database\Seeder;

class ShippingZoneSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $zones = [
            [
                'name' => 'Inside Kathmandu Valley',
                'sort_order' => 0,
                'rate' => ['base_fee_npr' => 100, 'per_kg_fee_npr' => 30, 'free_over_npr' => 5000, 'min_days' => 1, 'max_days' => 2],
            ],
            [
                'name' => 'Outside Valley (Major Cities)',
                'sort_order' => 1,
                'rate' => ['base_fee_npr' => 150, 'per_kg_fee_npr' => 60, 'free_over_npr' => 8000, 'min_days' => 3, 'max_days' => 5],
            ],
            [
                'name' => 'Remote Areas',
                'sort_order' => 2,
                'rate' => ['base_fee_npr' => 250, 'per_kg_fee_npr' => 120, 'free_over_npr' => null, 'min_days' => 5, 'max_days' => 10],
            ],
        ];

        foreach ($zones as $data) {
            $zone = ShippingZone::firstOrCreate(
                ['name' => $data['name']],
                ['is_active' => true, 'sort_order' => $data['sort_order']],
            );

            $zone->rate()->updateOrCreate([], $data['rate']);
        }

        // Give the test customer a saved default address for quick checkout testing.
        $customer = User::where('email', 'customer@kharidai.test')->first();
        $valley = ShippingZone::where('name', 'Inside Kathmandu Valley')->first();

        if ($customer !== null && $valley !== null) {
            $customer->shippingAddresses()->firstOrCreate(
                ['recipient_name' => 'Test Customer'],
                [
                    'shipping_zone_id' => $valley->id,
                    'mobile_number' => '9812345678',
                    'address_line' => 'Baneshwor, Kathmandu',
                    'city' => 'Kathmandu',
                    'landmark' => 'Near Chowk',
                    'is_default' => true,
                ],
            );
        }
    }
}
