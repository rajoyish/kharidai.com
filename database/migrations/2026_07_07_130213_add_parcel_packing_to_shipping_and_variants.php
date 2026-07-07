<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Shipping can now pack multiple light units into a single parcel. A zone
     * rate carries an optional per-parcel weight capacity (kg); when set, its
     * combinable items are grouped into parcels of that size. Bulky variants
     * opt out via `ships_individually`, always taking a parcel of their own.
     */
    public function up(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            $table->decimal('parcel_capacity_kg', 8, 2)->nullable()->after('per_kg_fee_npr');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->boolean('ships_individually')->default(false)->after('weight_kg');
        });
    }

    public function down(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            $table->dropColumn('parcel_capacity_kg');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('ships_individually');
        });
    }
};
