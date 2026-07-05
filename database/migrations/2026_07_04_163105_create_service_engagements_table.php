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
        Schema::create('service_engagements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('order_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source')->default('storefront')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('in_progress')->index();
            $table->unsignedBigInteger('price_npr')->default(0);
            $table->unsignedBigInteger('purchase_price_npr')->default(0);

            // Pricing terms are snapshotted at spawn so later edits to the
            // service's price sheet never retro-change an in-flight engagement.
            $table->string('pricing_strategy')->nullable();
            $table->json('pricing_config')->nullable();

            // Contract gate.
            $table->timestamp('contract_signed_at')->nullable();

            // Advance gate (all amounts in paisa).
            $table->unsignedBigInteger('advance_required_npr')->default(0);
            $table->unsignedBigInteger('advance_paid_npr')->default(0);
            $table->timestamp('advance_paid_at')->nullable();

            // Post-completion cost calculation + negotiation outcome.
            $table->json('measurement')->nullable();
            $table->unsignedBigInteger('calculated_cost_npr')->default(0);
            $table->unsignedBigInteger('agreed_price_npr')->nullable();

            $table->json('brief')->nullable();
            $table->text('delivery_note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_engagements');
    }
};
