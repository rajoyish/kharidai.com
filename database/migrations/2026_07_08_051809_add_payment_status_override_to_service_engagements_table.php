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
        Schema::table('service_engagements', function (Blueprint $table) {
            // A manual override for the payment status. When null the status is
            // derived from the outstanding balance; when set the admin has
            // explicitly marked the invoice paid (true) or due (false).
            $table->boolean('is_paid')->nullable()->after('tax_rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('service_engagements', function (Blueprint $table) {
            $table->dropColumn('is_paid');
        });
    }
};
