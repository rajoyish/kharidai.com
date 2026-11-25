<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which top-up lots paid for which purchase. Reversing a purchase hands
     * exactly these credits and this cost back to the same lots.
     */
    public function up(): void
    {
        Schema::create('wallet_purchase_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_purchase_id')->constrained()->cascadeOnDelete();
            $table->foreignId('wallet_top_up_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('credits');
            $table->unsignedBigInteger('cost_npr');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_purchase_allocations');
    }
};
