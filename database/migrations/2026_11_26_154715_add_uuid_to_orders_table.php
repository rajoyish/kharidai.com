<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Order pages were addressed by their auto-increment id, so anyone could walk
 * /orders/1, /orders/2, ... An order is now addressed by a random UUID; the id
 * stays the primary key for joins and foreign keys. The UUID is fully random
 * (v4): a time-ordered v7 would let one order's key hint at its neighbours'.
 *
 * Notifications already in the database carry links built from the old ids,
 * so those are rewritten to the new URLs. Links in emails already sent cannot
 * be changed; customers reach those orders from their orders list.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });

        DB::table('orders')->whereNull('uuid')->orderBy('id')->lazyById()->each(function (object $order): void {
            DB::table('orders')->where('id', $order->id)->update(['uuid' => (string) Str::uuid()]);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->uuid('uuid')->nullable(false)->change();
            $table->unique('uuid');
        });

        $this->rewriteNotificationLinks(fn (string $id, object $order): string => $order->uuid);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->rewriteNotificationLinks(fn (string $uuid, object $order): string => (string) $order->id);

        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }

    /**
     * Point each stored notification's order link at the order's new key.
     *
     * @param  Closure(string, object): string  $newKey  the URL segment to use, given the old one and the order row
     */
    private function rewriteNotificationLinks(Closure $newKey): void
    {
        $orders = DB::table('orders')->get(['id', 'uuid'])->keyBy('id');

        DB::table('notifications')
            ->where('data', 'like', '%order_id%')
            ->orderBy('id')
            ->lazyById(column: 'id')
            ->each(function (object $notification) use ($orders, $newKey): void {
                $data = json_decode($notification->data, true);
                $order = $orders->get($data['order_id'] ?? null);

                if (! is_array($data) || ! is_string($data['url'] ?? null) || $order === null) {
                    return;
                }

                $url = preg_replace_callback(
                    '#(/orders/)([^/?\#]+)#',
                    fn (array $match): string => $match[1].$newKey($match[2], $order),
                    $data['url'],
                    1,
                );

                if ($url !== $data['url']) {
                    $data['url'] = $url;
                    DB::table('notifications')->where('id', $notification->id)->update(['data' => json_encode($data)]);
                }
            });
    }
};
