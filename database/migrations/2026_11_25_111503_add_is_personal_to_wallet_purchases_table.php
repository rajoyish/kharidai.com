<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A purchase bought for the owner's own use. It spends wallet credits like
     * any other, but is not stock for a sale and never moves a variant's cost.
     */
    public function up(): void
    {
        Schema::table('wallet_purchases', function (Blueprint $table) {
            $table->boolean('is_personal')->default(false)->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('wallet_purchases', function (Blueprint $table) {
            $table->dropColumn('is_personal');
        });
    }
};
