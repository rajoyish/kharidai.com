<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            // Whether this variant's price is shown on the storefront. Services
            // are negotiated post-completion, so admins hide their price by
            // default and opt in per variant to reveal it.
            $table->boolean('show_pricing')->default(true)->after('purchase_price_npr');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('show_pricing');
        });
    }
};
