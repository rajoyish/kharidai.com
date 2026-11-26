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
        $this->replaceForeignKey('order_items_product_variant_id_foreign', 'order_items_variant_history_fk', 'restrict');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->replaceForeignKey('order_items_variant_history_fk', 'order_items_product_variant_id_foreign', 'cascade');
    }

    private function replaceForeignKey(string $oldName, string $newName, string $onDelete): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            // A single ALTER keeps the foreign key enforced throughout the change.
            DB::statement("ALTER TABLE order_items DROP FOREIGN KEY {$oldName},
                ADD CONSTRAINT {$newName} FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON DELETE {$onDelete}");

            return;
        }

        Schema::table('order_items', function (Blueprint $table) use ($newName, $onDelete): void {
            $table->dropForeign(['product_variant_id']);
            $table->foreign('product_variant_id', $newName)->references('id')->on('product_variants')->onDelete($onDelete);
        });
    }
};
