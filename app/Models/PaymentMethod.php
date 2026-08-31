<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * A payment provider the QR panel offers, with the admin switch that takes it
 * out of service while it is down. The rows are fixed — created by migration,
 * never by the admin — so only `is_enabled` is ever written.
 *
 * @property int $id
 * @property string $key
 * @property string $label
 * @property bool $is_enabled
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['is_enabled'])]
class PaymentMethod extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @param  Builder<PaymentMethod>  $query
     * @return Builder<PaymentMethod>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * The list shared with every Inertia page so the QR panel knows which
     * providers to offer and which to grey out. Three rows on an indexed read,
     * so it is left uncached: a cache would only add an invalidation surface,
     * and a stale entry would keep a provider live during its downtime.
     *
     * @return list<array{key: string, label: string, is_enabled: bool}>
     */
    public static function shared(): array
    {
        return array_values(
            self::query()
                ->ordered()
                ->get(['key', 'label', 'is_enabled'])
                ->map(fn (self $method): array => [
                    'key' => $method->key,
                    'label' => $method->label,
                    'is_enabled' => $method->is_enabled,
                ])
                ->all()
        );
    }
}
