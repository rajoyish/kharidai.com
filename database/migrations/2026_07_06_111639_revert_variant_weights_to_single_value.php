<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A variant is the priced and shipped unit, so it carries a single weight
     * used directly for shipping. Colors and sizes remain option lists.
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('weights');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedInteger('weight_grams')->nullable()->after('sizes');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('weight_grams');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->json('weights')->nullable()->after('sizes');
        });
    }
};
