<?php

namespace App\Models;

use App\Services\Mail\EmailQuotaTracker;
use App\Services\Mail\QuotaRecordingTransport;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * One email handed to a transport, for one address.
 *
 * Written by {@see QuotaRecordingTransport} and read by
 * {@see EmailQuotaTracker}. Nothing else should touch it.
 *
 * @property int $id
 * @property string $mailer
 * @property string $recipient
 * @property Carbon $sent_at
 */
#[Fillable(['mailer', 'recipient', 'sent_at'])]
class EmailDispatch extends Model
{
    public $timestamps = false;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<EmailDispatch>  $query
     * @return Builder<EmailDispatch>
     */
    public function scopeSentSince(Builder $query, CarbonInterface $since): Builder
    {
        return $query->where('sent_at', '>=', $since);
    }
}
