<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Fixtures for the Playwright browser suite.
 *
 * Seeds the admin that `_test/login-as-admin` logs in as, plus two products
 * with stable titles the delete-flow spec drives: one it deletes, and one it
 * asserts is left alone.
 */
class PlaywrightSeeder extends Seeder
{
    public const ADMIN_EMAIL = 'playwright-admin@example.test';

    public const PRODUCT_TO_DELETE = 'Playwright Delete Me';

    public const PRODUCT_TO_KEEP = 'Playwright Keep Me';

    public function run(): void
    {
        User::factory()->create([
            'name' => 'Playwright Admin',
            'email' => self::ADMIN_EMAIL,
            'is_admin' => true,
        ]);

        Product::factory()->create(['title' => self::PRODUCT_TO_DELETE]);
        Product::factory()->create(['title' => self::PRODUCT_TO_KEEP]);
    }
}
