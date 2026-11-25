<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A purchase paid from a supplier's wallet. Its NPR cost is the actual
     * cost basis of the credits it consumed, oldest lot first.
     */
    public function up(): void
    {
        Schema::create('wallet_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description')->nullable();
            $table->string('reference')->nullable();
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedBigInteger('unit_cost_credits');
            $table->unsignedBigInteger('credits_spent');
            $table->unsignedBigInteger('cost_npr');
            $table->dateTime('purchased_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['product_variant_id', 'purchased_at']);
            $table->index(['supplier_id', 'purchased_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_purchases');
    }
};
