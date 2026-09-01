<?php

namespace App\Models;

use App\Enums\NewsletterRecipientStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $newsletter_id
 * @property int $user_id
 * @property string $email
 * @property NewsletterRecipientStatus $status
 * @property string|null $mailer
 * @property Carbon|null $sent_at
 * @property string|null $error
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['newsletter_id', 'user_id', 'email', 'status', 'mailer', 'sent_at', 'error'])]
class NewsletterRecipient extends Model
{
    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'status' => NewsletterRecipientStatus::class,
            'sent_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Newsletter, $this> */
    public function newsletter(): BelongsTo
    {
        return $this->belongsTo(Newsletter::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isPending(): bool
    {
        return $this->status === NewsletterRecipientStatus::Pending;
    }

    public function markSent(string $mailer): void
    {
        $this->forceFill([
            'status' => NewsletterRecipientStatus::Sent,
            'mailer' => $mailer,
            'sent_at' => now(),
            'error' => null,
        ])->save();
    }

    public function markFailed(string $reason): void
    {
        $this->forceFill([
            'status' => NewsletterRecipientStatus::Failed,
            // The column is text, but a stack-trace-shaped driver message is noise
            // in a table an admin reads. Keep the first line's worth.
            'error' => Str::limit($reason, 500),
        ])->save();
    }
}
