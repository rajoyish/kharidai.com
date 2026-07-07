<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Shipping now works exclusively in kilograms, so variant and physical
     * product weights move from integer grams to decimal kilograms. Variants
     * also gain an optional advance-payment percentage collected at checkout.
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('weight_kg', 8, 2)->nullable()->after('sizes');
            $table->unsignedTinyInteger('advance_payment_percent')->nullable()->after('weight_kg');
        });

        DB::table('product_variants')
            ->whereNotNull('weight_grams')
            ->update(['weight_kg' => DB::raw('weight_grams / 1000.0')]);

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('weight_grams');
        });

        Schema::table('physical_product_details', function (Blueprint $table) {
            $table->decimal('weight_kg', 8, 2)->nullable()->after('product_id');
        });

        DB::table('physical_product_details')
            ->whereNotNull('weight_grams')
            ->update(['weight_kg' => DB::raw('weight_grams / 1000.0')]);

        Schema::table('physical_product_details', function (Blueprint $table) {
            $table->dropColumn('weight_grams');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedInteger('weight_grams')->nullable()->after('sizes');
        });

        DB::table('product_variants')
            ->whereNotNull('weight_kg')
            ->update(['weight_grams' => DB::raw('ROUND(weight_kg * 1000)')]);

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['weight_kg', 'advance_payment_percent']);
        });

        Schema::table('physical_product_details', function (Blueprint $table) {
            $table->unsignedInteger('weight_grams')->nullable()->after('product_id');
        });

        DB::table('physical_product_details')
            ->whereNotNull('weight_kg')
            ->update(['weight_grams' => DB::raw('ROUND(weight_kg * 1000)')]);

        Schema::table('physical_product_details', function (Blueprint $table) {
            $table->dropColumn('weight_kg');
        });
    }
};
