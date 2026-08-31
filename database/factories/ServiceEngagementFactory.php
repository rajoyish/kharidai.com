<?php

namespace Database\Factories;

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Enums\PricingStrategy;
use App\Models\Product;
use App\Models\ServiceEngagement;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ServiceEngagement>
 */
class ServiceEngagementFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'product_id' => Product::factory()->service(),
            'product_variant_id' => null,
            'order_item_id' => null,
            'source' => EngagementSource::Storefront,
            'created_by' => null,
            'status' => EngagementStatus::InProgress,
            'price_npr' => $this->faker->numberBetween(5000, 20000),
            'purchase_price_npr' => $this->faker->numberBetween(2000, 8000),
            'pricing_strategy' => PricingStrategy::PerHour,
            'pricing_config' => ['hourly_rate_npr' => 1500],
            'contract_signed_at' => null,
            'advance_required_npr' => 0,
            'advance_paid_npr' => 0,
            'advance_paid_at' => null,
            'project_completion_date' => null,
            'invoice_paid_at' => null,
            'measurement' => null,
            'project_name' => $this->faker->words(3, true),
            'line_items' => null,
            'tax_rate' => 13.00,
            'calculated_cost_npr' => 0,
            'agreed_price_npr' => null,
            'brief' => null,
            'delivery_note' => null,
        ];
    }

    public function adminAssigned(): static
    {
        return $this->state([
            'source' => EngagementSource::Admin,
            'created_by' => User::factory()->state(['is_admin' => true]),
        ]);
    }

    public function pendingContract(): static
    {
        return $this->state([
            'status' => EngagementStatus::PendingContract,
            'pricing_strategy' => PricingStrategy::Hybrid,
            'pricing_config' => [
                'hourly_rate_npr' => 2000,
                'tiers' => [
                    ['key' => 'basic', 'label' => 'Basic', 'price_npr' => 40000],
                ],
            ],
            'advance_required_npr' => 10000,
        ]);
    }

    public function awaitingAdvance(): static
    {
        return $this->state([
            'status' => EngagementStatus::AwaitingAdvance,
            'contract_signed_at' => now(),
            'advance_required_npr' => 10000,
        ]);
    }

    public function inProgress(): static
    {
        return $this->state(['status' => EngagementStatus::InProgress]);
    }

    public function negotiation(): static
    {
        return $this->state([
            'status' => EngagementStatus::Negotiation,
            'measurement' => ['hours' => 8],
            'calculated_cost_npr' => 12000,
        ]);
    }

    public function finalBilling(): static
    {
        return $this->state([
            'status' => EngagementStatus::FinalBilling,
            'measurement' => ['hours' => 8],
            'calculated_cost_npr' => 12000,
            'agreed_price_npr' => 11000,
        ]);
    }

    public function awaitingPayment(): static
    {
        return $this->state([
            'status' => EngagementStatus::AwaitingPayment,
            'measurement' => ['hours' => 8],
            'calculated_cost_npr' => 12000,
            'agreed_price_npr' => 11000,
        ]);
    }

    /**
     * An offline engagement whose manually recorded, settled profit feeds the
     * Monthly Tithe: no order, both offline figures set, marked paid. Set
     * `invoice_paid_at` as well to choose the month the profit is tithed in;
     * without it the engagement is left out of the tithe entirely.
     */
    public function offlineTithed(float $customerPaidNpr = 17000, float $purchaseCostNpr = 9040): static
    {
        return $this->state([
            'order_item_id' => null,
            'offline_customer_paid_npr' => $customerPaidNpr,
            'offline_purchase_cost_npr' => $purchaseCostNpr,
            'is_paid' => true,
        ]);
    }
}
