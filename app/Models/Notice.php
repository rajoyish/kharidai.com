<?php

namespace App\Models;

use Database\Factories\NoticeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * An announcement shown to signed-in customers in their panel.
 *
 * A published notice pops up once per user, the first time they open their
 * panel, and stays readable on the notices page after they dismiss it.
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $title
 * @property string $body
 * @property Carbon|null $published_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['user_id', 'title', 'body', 'published_at'])]
class Notice extends Model
{
    /** @use HasFactory<NoticeFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'published_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsToMany<User, $this> */
    public function dismissedBy(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'notice_dismissals')->withTimestamps();
    }

    public function isPublished(): bool
    {
        return $this->published_at !== null && $this->published_at->isPast();
    }

    /**
     * Published notices addressed to this user.
     *
     * A notice reaches the accounts that existed when it was published, so a
     * customer who signs up next month is not greeted by an apology for a
     * product they never bought.
     *
     * @param  Builder<Notice>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        $query->whereNotNull('published_at')
            ->where('published_at', '<=', now())
            ->where('published_at', '>=', $user->created_at);
    }

    /**
     * @param  Builder<Notice>  $query
     */
    public function scopeNotDismissedBy(Builder $query, User $user): void
    {
        $query->whereDoesntHave('dismissedBy', fn (Builder $dismissals) => $dismissals->whereKey($user->id));
    }

    public function isVisibleTo(User $user): bool
    {
        return $this->isPublished() && $this->published_at->gte($user->created_at);
    }
}
