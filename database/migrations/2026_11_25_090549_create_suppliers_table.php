<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Who products are bought from and where the order is placed. Each
     * supplier holds its own prepaid wallet: top-ups fund it and purchases
     * draw it down.
     */
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('platform', 20);
            $table->string('contact')->nullable();
            $table->string('voucher_currency', 3)->default('USD');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
