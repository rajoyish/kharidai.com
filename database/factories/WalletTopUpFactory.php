<?php

namespace Database\Factories;

use App\Models\Supplier;
use App\Models\WalletTopUp;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A $10 voucher bought for $12.05 at NPR 131.42 that redeemed for
 * 8.09676294 credits, untouched by any purchase.
 *
 * @extends Factory<WalletTopUp>
 */
class WalletTopUpFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'supplier_id' => Supplier::factory(),
            'reference' => strtoupper($this->faker->bothify('VCH-####')),
            'face_value' => 10,
            'amount_paid' => 12.05,
            'paid_currency' => 'USD',
            'fx_rate' => 131.42,
            'cost_npr' => 1583.61,
            'cost_remaining_npr' => 1583.61,
            'credits_received' => '8.09676294',
            'credits_remaining' => '8.09676294',
            'topped_up_at' => now(),
            'notes' => null,
        ];
    }
}
