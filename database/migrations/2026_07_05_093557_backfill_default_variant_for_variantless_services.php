<?php

use App\Enums\ProductType;
use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Give every existing service without a variant a default orderable unit so
     * it can be added to the cart. New/edited services get this via
     * {@see Product::ensureOrderableVariant()} on save.
     */
    public function up(): void
    {
        Product::query()
            ->where('type', ProductType::Service)
            ->doesntHave('variants')
            ->each(fn (Product $product) => $product->ensureOrderableVariant());
    }

    public function down(): void
    {
        // Non-reversible: cannot distinguish backfilled defaults from real variants.
    }
};
