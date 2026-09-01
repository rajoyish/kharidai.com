<?php

namespace App\Models;

use App\Enums\NewsletterRecipientStatus;
use App\Enums\NewsletterStatus;
use Database\Factories\NewsletterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A mass email to registered users, plus its delivery record.
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $subject
 * @property string $body
 * @property NewsletterStatus $status
 * @property int $recipient_count
 * @property int $sent_count
 * @property int $failed_count
 * @property Carbon|null $queued_at
 * @property Carbon|null $completed_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'subject', 'body', 'status'])]
class Newsletter extends Model
{
    /** @use HasFactory<NewsletterFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => NewsletterStatus::class,
            'queued_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return HasMany<NewsletterRecipient, $this> */
    public function recipients(): HasMany
    {
        return $this->hasMany(NewsletterRecipient::class);
    }

    public function markQueued(): void
    {
        $this->forceFill([
            'status' => NewsletterStatus::Queued,
            'queued_at' => now(),
            'completed_at' => null,
        ])->save();
    }

    /**
     * Move a queued or resumed newsletter into "sending".
     *
     * Called from every recipient job, so it writes only on an actual transition —
     * an unconditional save here would be one write per email for no new fact.
     */
    public function markSending(): void
    {
        if ($this->status === NewsletterStatus::Sending) {
            return;
        }

        $this->forceFill(['status' => NewsletterStatus::Sending])->save();
    }

    /**
     * Record that the daily quota stopped the run. The queued jobs are released,
     * not dropped, so this is a status an admin can read rather than a failure.
     */
    public function markPaused(): void
    {
        if ($this->status === NewsletterStatus::Paused) {
            return;
        }

        $this->forceFill(['status' => NewsletterStatus::Paused])->save();
    }

    /**
     * Recount delivery from the recipients table and close the newsletter once
     * nothing is pending.
     *
     * Counted rather than incremented: a job that is retried after a transport
     * timeout would double-count an increment, and the counts are what the admin
     * screen reports.
     */
    public function refreshProgress(): void
    {
        $counts = $this->recipients()
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $pending = (int) $counts->get(NewsletterRecipientStatus::Pending->value, 0);
        $sent = (int) $counts->get(NewsletterRecipientStatus::Sent->value, 0);
        $failed = (int) $counts->get(NewsletterRecipientStatus::Failed->value, 0);

        $this->forceFill([
            'sent_count' => $sent,
            'failed_count' => $failed,
            'status' => $pending === 0 ? NewsletterStatus::Sent : $this->status,
            'completed_at' => $pending === 0 ? ($this->completed_at ?? now()) : null,
        ])->save();
    }
}
