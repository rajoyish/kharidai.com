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
            // Invoice brief: the project label, its editable line items (each a
            // {label, quantity, unit_price_npr} row in whole NPR), the tax rate
            // applied to the subtotal, and the date the work was delivered.
            $table->string('project_name')->nullable()->after('order_item_id');
            $table->json('line_items')->nullable()->after('measurement');
            $table->decimal('tax_rate', 5, 2)->default(13.00)->after('line_items');
            $table->date('project_completion_date')->nullable()->after('advance_paid_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_engagements', function (Blueprint $table) {
            $table->dropColumn(['project_name', 'line_items', 'tax_rate', 'project_completion_date']);
        });
    }
};
