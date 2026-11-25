<?php

namespace Database\Factories;

use App\Models\Supplier;
use App\Models\WalletPurchase;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * A bare purchase row with no lot allocations. Use WalletLedger::recordPurchase()
 * when a test needs balances to move.
 *
 * @extends Factory<WalletPurchase>
 */
class WalletPurchaseFactory extends Factory
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
            'product_variant_id' => null,
            'description' => $this->faker->words(3, true),
            'quantity' => 1,
            'unit_cost_credits' => '2.04000000',
            'credits_spent' => '2.04000000',
            'cost_npr' => 399,
            'purchased_at' => now(),
        ];
    }
}
