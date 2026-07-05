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
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending')->index();
            // Destination snapshot, captured at checkout so history is stable
            // even if the source address is later edited or removed.
            $table->string('recipient_name');
            $table->string('mobile_number');
            $table->string('address_line');
            $table->string('city');
            $table->string('landmark')->nullable();
            $table->string('zone_name')->nullable();
            $table->text('tracking_note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
