<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_tithe_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monthly_tithe_id')->constrained()->cascadeOnDelete();

            // Exactly one of these is set: the record that earned the profit. Both
            // cascade, so deleting an order or an engagement takes its settlement
            // record with it rather than leaving an orphan behind.
            $table->foreignId('order_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('service_engagement_id')->nullable()->constrained()->cascadeOnDelete();

            $table->boolean('is_paid')->default(false);
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            // One settlement record per earning record per month. The amount owed is
            // recomputed from profit rather than stored here. Both names are given
            // explicitly: the generated ones overflow MySQL's 64-character limit.
            $table->unique(['monthly_tithe_id', 'order_id'], 'tithe_items_order_unique');
            $table->unique(['monthly_tithe_id', 'service_engagement_id'], 'tithe_items_service_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_tithe_items');
    }
};
