<?php

namespace Database\Seeders;

use App\Enums\AdvanceType;
use App\Enums\EngagementSource;
use App\Enums\PricingStrategy;
use App\Enums\ProductType;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\Engagements\EngagementStateMachine;
use Illuminate\Database\Seeder;

class ServiceProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $category = Category::where('name', 'Marketing & Design Services')->first();

        $tiers = [
            ['key' => 'basic', 'label' => 'Basic', 'price_npr' => 20000],
            ['key' => 'standard', 'label' => 'Standard', 'price_npr' => 45000],
            ['key' => 'premium', 'label' => 'Premium', 'price_npr' => 90000],
        ];

        $services = [
            [
                'title' => 'Logo & Graphic Design',
                'description' => 'Logos, social media, and marketing graphics billed by the hour.',
                'is_visible' => true,
                'estimate_npr' => 5000,
                'detail' => [
                    'pricing_strategy' => PricingStrategy::PerHour,
                    'pricing_config' => ['hourly_rate_npr' => 1500],
                ],
            ],
            [
                'title' => 'Book Layout Design',
                'description' => 'Interior book layout priced per page, with distinct cover and inner rates.',
                'is_visible' => true,
                'estimate_npr' => 8000,
                'detail' => [
                    'pricing_strategy' => PricingStrategy::PerPage,
                    'pricing_config' => ['cover_rate_npr' => 800, 'inner_rate_npr' => 100],
                ],
            ],
            [
                'title' => 'Video Editing',
                'description' => 'Reels, ads, and long-form editing via tiered packages or an hourly rate.',
                'is_visible' => true,
                'estimate_npr' => 6000,
                'detail' => [
                    'pricing_strategy' => PricingStrategy::Hybrid,
                    'pricing_config' => ['hourly_rate_npr' => 2000, 'tiers' => $tiers],
                ],
            ],
            [
                'title' => 'Web Development',
                'description' => 'Custom web builds. Requires a signed contract and an advance before work starts.',
                'is_visible' => true,
                'estimate_npr' => 60000,
                'detail' => [
                    'pricing_strategy' => PricingStrategy::Hybrid,
                    'pricing_config' => ['hourly_rate_npr' => 3000, 'tiers' => $tiers],
                    'requires_contract' => true,
                    'requires_advance' => true,
                    'advance_type' => AdvanceType::Fixed,
                    'advance_value' => 20000,
                ],
            ],
            [
                // Hidden service: not shown on the storefront, but fully available in the
                // admin panel for accounting and manual assignment.
                'title' => 'Retainer: Enterprise Social Management',
                'description' => 'Private monthly retainer engagement assigned manually by an admin.',
                'is_visible' => false,
                'estimate_npr' => 45000,
                'detail' => [
                    'pricing_strategy' => PricingStrategy::PerHour,
                    'pricing_config' => ['hourly_rate_npr' => 2500],
                ],
            ],
        ];

        foreach ($services as $data) {
            $product = Product::create([
                'type' => ProductType::Service,
                'title' => $data['title'],
                'description' => $data['description'],
                'image' => null,
                'in_stock' => true,
                'is_visible' => $data['is_visible'],
                'category_id' => $category?->id,
            ]);

            // A single reference variant carries a rough estimate; the real cost is
            // calculated after completion and then negotiated.
            $product->variants()->create([
                'name' => 'Estimate',
                'price_npr' => $data['estimate_npr'],
                'purchase_price_npr' => (int) round($data['estimate_npr'] * 0.4),
            ]);

            $product->serviceDetail()->create(array_merge([
                'requires_brief' => true,
                'delivery_days' => 7,
                'revisions' => 2,
                'requires_contract' => false,
                'requires_advance' => false,
                'advance_type' => null,
                'advance_value' => null,
            ], $data['detail']));
        }

        $this->seedSampleEngagements();
    }

    /**
     * Seed a couple of example engagements so the admin/user views have data.
     */
    private function seedSampleEngagements(): void
    {
        $admin = User::where('email', 'admin@kharidai.test')->first();
        $customer = User::where('email', 'customer@kharidai.test')->first();

        if ($customer === null) {
            return;
        }

        $machine = app(EngagementStateMachine::class);

        // An admin-assigned engagement against the hidden retainer service.
        $this->seedEngagement($machine, 'Retainer: Enterprise Social Management', $customer, EngagementSource::Admin, $admin?->id, [
            'note' => 'Monthly retainer for enterprise social channels.',
        ]);

        // A storefront-style engagement against a visible service.
        $this->seedEngagement($machine, 'Logo & Graphic Design', $customer, EngagementSource::Storefront, null, [
            'note' => 'Need a logo for my coffee shop.',
        ]);

        // A web-development engagement parked at the contract gate.
        $this->seedEngagement($machine, 'Web Development', $customer, EngagementSource::Storefront, null, [
            'note' => 'Marketing site with a blog.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $brief
     */
    private function seedEngagement(
        EngagementStateMachine $machine,
        string $productTitle,
        User $customer,
        EngagementSource $source,
        ?int $createdBy,
        array $brief,
    ): void {
        $product = Product::with('serviceDetail')->where('title', $productTitle)->first();
        $detail = $product?->serviceDetail;

        if ($product === null || $detail === null) {
            return;
        }

        $variant = $product->variants()->first();
        $estimate = $variant?->price_npr ?? 0.0;

        $customer->serviceEngagements()->create([
            'product_id' => $product->id,
            'product_variant_id' => $variant?->id,
            'source' => $source,
            'created_by' => $createdBy,
            'status' => $machine->initialStatusFor($detail),
            'price_npr' => $estimate,
            'purchase_price_npr' => $variant?->purchase_price_npr ?? 0.0,
            'pricing_strategy' => $detail->pricing_strategy,
            'pricing_config' => $detail->pricing_config,
            'advance_required_npr' => $detail->advanceAmountNpr($estimate),
            'brief' => $brief,
        ]);
    }
}
