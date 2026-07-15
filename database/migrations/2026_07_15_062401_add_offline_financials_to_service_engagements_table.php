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
        Schema::table('service_engagements', function (Blueprint $table) {
            // Offline profit tracking for engagements that never pass through a
            // standard Order (e.g. an in-person domain renewal). Both are integer
            // paisa. When a customer-paid amount is recorded the engagement earns a
            // manual profit — customer paid minus the admin's purchase cost — which
            // feeds the Monthly Tithe calculation just like a completed order does.
            $table->unsignedBigInteger('offline_customer_paid_npr')->nullable()->after('agreed_price_npr');
            $table->unsignedBigInteger('offline_purchase_cost_npr')->nullable()->after('offline_customer_paid_npr');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_engagements', function (Blueprint $table) {
            $table->dropColumn(['offline_customer_paid_npr', 'offline_purchase_cost_npr']);
        });
    }
};
