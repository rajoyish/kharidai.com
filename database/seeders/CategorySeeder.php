<?php

namespace Database\Seeders;

use App\Enums\ProductType;
use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Flat digital categories (existing catalogue).
        $digitalCategories = [
            'AI Subscriptions',
            'Cloud Storage',
            'Productivity Software',
            'VPN Services',
            'Creative Tools',
        ];

        foreach ($digitalCategories as $name) {
            Category::firstOrCreate(
                ['name' => $name],
                ['slug' => Str::slug($name), 'type' => ProductType::Digital],
            );
        }

        // Hierarchical physical categories: Fashion → {Clothes → {Men, Women}, Watches, Cosmetics}.
        $fashion = Category::firstOrCreate(
            ['name' => 'Fashion'],
            ['slug' => 'fashion', 'type' => ProductType::Physical, 'sort_order' => 0],
        );

        $clothes = $this->child('Clothes', $fashion, 0);
        $this->child('Men', $clothes, 0);
        $this->child('Women', $clothes, 1);
        $this->child('Watches', $fashion, 1);
        $this->child('Cosmetics', $fashion, 2);

        // Services category (freelancing tasks).
        Category::firstOrCreate(
            ['name' => 'Marketing & Design Services'],
            ['slug' => 'marketing-design-services', 'type' => ProductType::Service, 'sort_order' => 0],
        );
    }

    private function child(string $name, Category $parent, int $sortOrder): Category
    {
        return Category::firstOrCreate(
            ['name' => $name],
            [
                'slug' => Str::slug($name),
                'parent_id' => $parent->id,
                'type' => $parent->type,
                'sort_order' => $sortOrder,
            ],
        );
    }
}
