<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The supplier a variant is bought from and its price there in credits,
     * which the price calculator starts from.
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->foreignId('supplier_id')->nullable()->after('purchase_price_npr')->constrained()->nullOnDelete();
            $table->unsignedBigInteger('supplier_cost_credits')->nullable()->after('supplier_id');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropConstrainedForeignId('supplier_id');
            $table->dropColumn('supplier_cost_credits');
        });
    }
};
