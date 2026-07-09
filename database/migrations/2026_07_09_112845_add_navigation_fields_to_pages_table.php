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
        Schema::table('pages', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->default(0)->after('published_at');
            $table->boolean('show_in_nav')->default(true)->after('sort_order');
            $table->boolean('show_in_footer')->default(true)->after('show_in_nav');

            $table->index('sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pages', function (Blueprint $table) {
            $table->dropIndex(['sort_order']);
            $table->dropColumn(['sort_order', 'show_in_nav', 'show_in_footer']);
        });
    }
};
