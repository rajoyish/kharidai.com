<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The providers the QR payment panel offers, in display order. The keys
     * match the ones the panel already used for its QR images.
     *
     * @var list<array{key: string, label: string}>
     */
    private const PROVIDERS = [
        ['key' => 'default', 'label' => 'Mobile Banking'],
        ['key' => 'esewa', 'label' => 'eSewa'],
        ['key' => 'khalti', 'label' => 'Khalti'],
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('label');
            $table->boolean('is_enabled')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        $now = now();

        DB::table('payment_methods')->insert(array_map(
            fn (array $provider, int $index): array => [
                ...$provider,
                'is_enabled' => true,
                'sort_order' => $index,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            self::PROVIDERS,
            array_keys(self::PROVIDERS),
        ));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
};
