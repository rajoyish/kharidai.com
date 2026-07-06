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
            $table->dropColumn(['weight_grams', 'color', 'size']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->json('colors')->nullable()->after('validity_days');
            $table->json('sizes')->nullable()->after('colors');
            $table->json('weights')->nullable()->after('sizes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['colors', 'sizes', 'weights']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedInteger('weight_grams')->nullable()->after('validity_days');
            $table->string('color')->nullable()->after('weight_grams');
            $table->string('size')->nullable()->after('color');
        });
    }
};
