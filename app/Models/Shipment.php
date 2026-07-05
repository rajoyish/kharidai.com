<?php

namespace App\Models;

use Database\Factories\ShipmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $order_id
 * @property string $status
 * @property string $recipient_name
 * @property string $mobile_number
 * @property string $address_line
 * @property string $city
 * @property string|null $landmark
 * @property string|null $zone_name
 * @property string|null $tracking_note
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Order $order
 */
#[Fillable([
    'order_id',
    'status',
    'recipient_name',
    'mobile_number',
    'address_line',
    'city',
    'landmark',
    'zone_name',
    'tracking_note',
])]
class Shipment extends Model
{
    /** @use HasFactory<ShipmentFactory> */
    use HasFactory;

    public const STATUSES = ['pending', 'packed', 'shipped', 'delivered'];

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
