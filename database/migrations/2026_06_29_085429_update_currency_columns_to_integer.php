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
        // Drop any lingering usd columns just in case
        if (Schema::hasColumn('product_variants', 'purchase_price_usd')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->dropColumn('purchase_price_usd');
            });
        }
        
        // Multiply by 100 first to preserve data
        DB::statement('UPDATE product_variants SET price_npr = price_npr * 100, purchase_price_npr = purchase_price_npr * 100');
        DB::statement('UPDATE order_items SET price = price * 100, purchase_price = purchase_price * 100');
        DB::statement('UPDATE orders SET total_amount = total_amount * 100');

        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedBigInteger('price_npr')->default(0)->change();
            $table->unsignedBigInteger('purchase_price_npr')->default(0)->change();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('price')->default(0)->change();
            $table->unsignedBigInteger('purchase_price')->default(0)->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('total_amount')->default(0)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('price_npr', 10, 2)->default(0)->change();
            $table->decimal('purchase_price_npr', 10, 2)->default(0)->change();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->default(0)->change();
            $table->decimal('purchase_price', 10, 2)->default(0)->change();
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('total_amount', 10, 2)->default(0)->change();
        });

        // Revert data
        DB::statement('UPDATE product_variants SET price_npr = price_npr / 100, purchase_price_npr = purchase_price_npr / 100');
        DB::statement('UPDATE order_items SET price = price / 100, purchase_price = purchase_price / 100');
        DB::statement('UPDATE orders SET total_amount = total_amount / 100');
    }
};
