<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Records the color/size the shopper chose for a line item, so the same
     * variant in different options is a distinct line and the seller knows
     * exactly what to ship.
     */
    public function up(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->json('selected_options')->nullable()->after('quantity');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->json('selected_options')->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn('selected_options');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('selected_options');
        });
    }
};
