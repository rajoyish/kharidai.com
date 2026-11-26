<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Subscriptions are sold by the month, so a variant's validity is now counted
 * in months. Existing day counts round to the nearest month (30 → 1, 182 → 6,
 * 365 → 12), never below one; subscriptions already issued keep their dates.
 */
return new class extends Migration
{
    /** The average month, so the rounding is fair across 28–31 day months. */
    private const float DAYS_PER_MONTH = 365.25 / 12;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->unsignedSmallInteger('validity_months')->nullable()->after('validity_days');
        });

        DB::table('product_variants')
            ->whereNotNull('validity_days')
            ->orderBy('id')
            ->each(function (object $variant): void {
                DB::table('product_variants')->where('id', $variant->id)->update([
                    'validity_months' => max(1, (int) round($variant->validity_days / self::DAYS_PER_MONTH)),
                ]);
            });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('validity_days');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->integer('validity_days')->nullable()->after('validity_months');
        });

        DB::table('product_variants')
            ->whereNotNull('validity_months')
            ->orderBy('id')
            ->each(function (object $variant): void {
                DB::table('product_variants')->where('id', $variant->id)->update([
                    'validity_days' => (int) round($variant->validity_months * self::DAYS_PER_MONTH),
                ]);
            });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('validity_months');
        });
    }
};
