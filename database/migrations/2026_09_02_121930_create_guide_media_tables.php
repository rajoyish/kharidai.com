<?php

use App\Models\GuideMedia;
use App\Models\ProductGuide;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guide_media', function (Blueprint $table) {
            $table->id();
            $table->string('file_name');
            $table->string('file_path');
            // Never 'public'. The whole point of this table is a file the web
            // server will not hand out on its own.
            $table->string('disk')->default('local');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->timestamps();
        });

        Schema::create('product_guide_media', function (Blueprint $table) {
            $table->id();
            $table->foreignIdFor(ProductGuide::class)->constrained()->cascadeOnDelete();
            $table->foreignIdFor(GuideMedia::class)->constrained('guide_media')->cascadeOnDelete();
            $table->timestamps();

            // Named explicitly: the generated name would run past MySQL's
            // 64-character index-name limit, which SQLite would not catch.
            $table->unique(['product_guide_id', 'guide_media_id'], 'guide_media_guide_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_guide_media');
        Schema::dropIfExists('guide_media');
    }
};
