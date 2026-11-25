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
            // Paisa, like every other money column. Null means no refund was issued.
            $table->unsignedBigInteger('refund_amount')->nullable()->after('balance_due');
            $table->date('refunded_on')->nullable()->after('refund_amount');
            $table->string('refund_receipt_path')->nullable()->after('refunded_on');
            $table->text('refund_note')->nullable()->after('refund_receipt_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['refund_amount', 'refunded_on', 'refund_receipt_path', 'refund_note']);
        });
    }
};
