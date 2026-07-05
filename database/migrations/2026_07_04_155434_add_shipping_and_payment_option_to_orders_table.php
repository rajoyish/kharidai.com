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
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('items_total')->default(0)->after('total_amount');
            $table->unsignedBigInteger('shipping_total')->default(0)->after('items_total');
            $table->unsignedBigInteger('amount_due_now')->default(0)->after('shipping_total');
            $table->unsignedBigInteger('balance_due')->default(0)->after('amount_due_now');
            $table->string('payment_option')->nullable()->after('balance_due');
            $table->foreignId('shipping_address_id')->nullable()->after('payment_option')->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['shipping_address_id']);
            $table->dropColumn([
                'items_total',
                'shipping_total',
                'amount_due_now',
                'balance_due',
                'payment_option',
                'shipping_address_id',
            ]);
        });
    }
};
