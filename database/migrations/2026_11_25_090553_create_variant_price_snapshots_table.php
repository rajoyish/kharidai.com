<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Point-in-time record of a variant's price and the cost it was set
     * against, so price curves and margin trends survive later edits.
     */
    public function up(): void
    {
        Schema::create('variant_price_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 20);
            $table->unsignedBigInteger('selling_price_npr');
            $table->unsignedBigInteger('purchase_price_npr')->nullable();
            $table->unsignedBigInteger('landed_cost_npr')->nullable();
            $table->unsignedBigInteger('supplier_cost_credits')->nullable();
            $table->decimal('npr_per_credit', 16, 6)->nullable();
            $table->string('cost_basis', 20)->nullable();
            $table->unsignedBigInteger('target_profit_npr')->nullable();
            $table->decimal('target_margin_percent', 6, 2)->nullable();
            $table->unsignedBigInteger('extra_cost_npr')->nullable();
            $table->string('rounding', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['product_variant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('variant_price_snapshots');
    }
};
