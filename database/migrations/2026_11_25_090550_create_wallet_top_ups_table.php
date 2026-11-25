<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One top-up of a supplier's wallet, kept as a cost lot. Credits are stored as integer
     * hundred-millionths and NPR as integer paisa, so drawing a lot down
     * across many purchases never accumulates rounding drift.
     */
    public function up(): void
    {
        Schema::create('wallet_top_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
            $table->string('reference')->nullable();
            $table->decimal('face_value', 14, 4);
            $table->decimal('amount_paid', 14, 4);
            $table->string('paid_currency', 3);
            $table->decimal('fx_rate', 14, 6);
            $table->unsignedBigInteger('cost_npr');
            $table->unsignedBigInteger('cost_remaining_npr');
            $table->unsignedBigInteger('credits_received');
            $table->unsignedBigInteger('credits_remaining');
            $table->dateTime('topped_up_at');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['supplier_id', 'topped_up_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_top_ups');
    }
};
