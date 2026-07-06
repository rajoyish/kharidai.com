<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('category_product', function (Blueprint $table) {
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();

            $table->primary(['category_id', 'product_id']);
        });

        // Preserve existing single-category assignments in the new pivot.
        DB::table('products')
            ->whereNotNull('category_id')
            ->orderBy('id')
            ->each(function (object $product): void {
                DB::table('category_product')->insert([
                    'category_id' => $product->category_id,
                    'product_id' => $product->id,
                ]);
            });

        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('id')->constrained()->nullOnDelete();
        });

        // Restore a single category per product (the lowest category id) so the
        // legacy belongsTo column is populated again.
        DB::table('category_product')
            ->orderBy('product_id')
            ->orderBy('category_id')
            ->get()
            ->groupBy('product_id')
            ->each(function ($rows, $productId): void {
                DB::table('products')
                    ->where('id', $productId)
                    ->update(['category_id' => $rows->first()->category_id]);
            });

        Schema::dropIfExists('category_product');
    }
};
