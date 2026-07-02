<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasIndex('subscriptions', 'subscriptions_order_item_id_unique', 'unique')) {
            Schema::table('subscriptions', function (Blueprint $table) {
                $table->dropUnique('subscriptions_order_item_id_unique');
            });
        }

        $hasDaysLeftColumn = Schema::hasColumn('subscriptions', 'days_left');

        $orderItemsNeedingSplit = DB::table('order_items')
            ->join('product_variants', 'product_variants.id', '=', 'order_items.product_variant_id')
            ->leftJoin('subscriptions', 'subscriptions.order_item_id', '=', 'order_items.id')
            ->where('order_items.quantity', '>', 1)
            ->whereNotNull('product_variants.validity_days')
            ->groupBy('order_items.id', 'order_items.quantity', 'product_variants.validity_days')
            ->havingRaw('COUNT(subscriptions.id) > 0')
            ->havingRaw('COUNT(subscriptions.id) < order_items.quantity')
            ->select([
                'order_items.id',
                'order_items.quantity',
                'product_variants.validity_days',
            ])
            ->get();

        foreach ($orderItemsNeedingSplit as $orderItem) {
            $existingSubscriptions = DB::table('subscriptions')
                ->where('order_item_id', $orderItem->id)
                ->orderBy('id')
                ->get();

            if ($existingSubscriptions->isEmpty()) {
                continue;
            }

            $firstSubscription = $existingSubscriptions->first();
            $startDate = Carbon::parse($firstSubscription->start_date)->startOfDay();
            $endDate = $startDate->copy()->addDays($orderItem->validity_days)->toDateString();
            $daysLeft = $startDate->diffInDays(Carbon::parse($endDate)->startOfDay(), false);

            $subscriptionUpdate = [
                'end_date' => $endDate,
            ];

            if ($hasDaysLeftColumn) {
                $subscriptionUpdate['days_left'] = max($daysLeft, 0);
            }

            DB::table('subscriptions')
                ->whereIn('id', $existingSubscriptions->pluck('id'))
                ->update($subscriptionUpdate);

            $missingSubscriptions = $orderItem->quantity - $existingSubscriptions->count();

            if ($missingSubscriptions <= 0) {
                continue;
            }

            $newSubscriptions = [];

            for ($index = 0; $index < $missingSubscriptions; $index++) {
                $newSubscription = [
                    'user_id' => $firstSubscription->user_id,
                    'order_id' => $firstSubscription->order_id,
                    'order_item_id' => $firstSubscription->order_item_id,
                    'start_date' => $firstSubscription->start_date,
                    'end_date' => $endDate,
                    'user_label' => null,
                    'created_at' => $firstSubscription->created_at,
                    'updated_at' => $firstSubscription->updated_at,
                ];

                if ($hasDaysLeftColumn) {
                    $newSubscription['days_left'] = max($daysLeft, 0);
                }

                $newSubscriptions[] = $newSubscription;
            }

            DB::table('subscriptions')->insert($newSubscriptions);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasIndex('subscriptions', 'subscriptions_order_item_id_unique', 'unique')) {
            return;
        }

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->unique('order_item_id');
        });
    }
};
