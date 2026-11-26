<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            // An admin's delete hides the order rather than erasing it, so the
            // receipt, shipment and subscriptions survive until a restore or a
            // deliberate permanent delete.
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropSoftDeletes();
        });
    }
};
