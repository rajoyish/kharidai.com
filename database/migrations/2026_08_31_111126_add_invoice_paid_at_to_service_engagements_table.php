<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_engagements', function (Blueprint $table) {
            // The date the invoice was actually settled. An offline engagement's
            // profit is attributed to this date's month in the Monthly Tithe, so a
            // payment received long after delivery is tithed when it arrives rather
            // than when the work finished.
            $table->date('invoice_paid_at')->nullable()->after('project_completion_date');
        });

        // Offline engagements were tithed on their completion date, falling back to
        // when they were created. Seed that same date so already-levied months keep
        // the profit they were calculated from.
        DB::table('service_engagements')
            ->whereNull('order_item_id')
            ->whereNotNull('product_id')
            ->whereNotNull('offline_customer_paid_npr')
            ->where('is_paid', true)
            ->update(['invoice_paid_at' => DB::raw('COALESCE(project_completion_date, DATE(created_at))')]);
    }

    public function down(): void
    {
        Schema::table('service_engagements', function (Blueprint $table) {
            $table->dropColumn('invoice_paid_at');
        });
    }
};
