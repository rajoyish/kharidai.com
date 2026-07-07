<?php

namespace Database\Seeders;

use App\Enums\ProductType;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class PhysicalProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = Category::whereIn('name', ['Men', 'Women', 'Watches', 'Cosmetics'])
            ->get()
            ->keyBy('name');

        $products = [
            [
                'title' => 'Classic Cotton T-Shirt',
                'description' => 'Soft, breathable everyday cotton t-shirt.',
                'category' => 'Men',
                'price_npr' => 1200,
                'variants' => ['Small', 'Medium', 'Large', 'Extra Large'],
                'detail' => ['weight_kg' => 0.25, 'flat_shipping_npr' => null, 'free_shipping' => false],
            ],
            [
                'title' => 'Summer Floral Dress',
                'description' => 'Lightweight floral dress for warm days.',
                'category' => 'Women',
                'price_npr' => 2800,
                'variants' => ['Small', 'Medium', 'Large'],
                'detail' => ['weight_kg' => 0.4, 'flat_shipping_npr' => null, 'free_shipping' => true],
            ],
            [
                'title' => 'Minimalist Analog Watch',
                'description' => 'Stainless steel analog watch with a leather strap.',
                'category' => 'Watches',
                'price_npr' => 6500,
                'variants' => ['Silver', 'Rose Gold', 'Black'],
                'detail' => ['weight_kg' => 0.3, 'flat_shipping_npr' => 200, 'free_shipping' => false],
            ],
            [
                'title' => 'Hydrating Face Serum',
                'description' => 'Vitamin C face serum for daily skincare.',
                'category' => 'Cosmetics',
                'price_npr' => 1800,
                'variants' => ['30ml', '50ml'],
                'detail' => ['weight_kg' => 0.15, 'flat_shipping_npr' => null, 'free_shipping' => false],
            ],
        ];

        foreach ($products as $data) {
            $product = Product::create([
                'type' => ProductType::Physical,
                'title' => $data['title'],
                'description' => $data['description'],
                'image' => null,
                'in_stock' => true,
                'is_visible' => true,
                'category_id' => $categories->get($data['category'])?->id,
            ]);

            foreach ($data['variants'] as $variantName) {
                $product->variants()->create([
                    'name' => $variantName,
                    'price_npr' => $data['price_npr'],
                    'purchase_price_npr' => $data['price_npr'] * 0.6,
                ]);
            }

            $product->physicalDetail()->create($data['detail']);
        }
    }
}
