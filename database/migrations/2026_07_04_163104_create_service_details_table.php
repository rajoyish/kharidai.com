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
        Schema::create('service_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('requires_brief')->default(true);
            $table->unsignedInteger('delivery_days')->nullable();
            $table->unsignedInteger('revisions')->nullable();

            // Flexible pricing: the strategy names the calculator and the JSON
            // config holds its parameters (hourly rate, cover/inner page rates,
            // tier tables, …) so new pricing rules never require schema changes.
            $table->string('pricing_strategy')->default('per_hour')->index();
            $table->json('pricing_config')->nullable();

            // Lifecycle gates. Web development, for example, mandates both.
            $table->boolean('requires_contract')->default(false);
            $table->boolean('requires_advance')->default(false);
            $table->string('advance_type')->nullable(); // percent | fixed
            $table->unsignedInteger('advance_value')->nullable(); // NPR when fixed, 0-100 when percent
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_details');
    }
};
