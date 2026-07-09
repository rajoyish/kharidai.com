<?php

namespace App\Models;

use App\Models\Concerns\HasUniqueSlug;
use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string $slug
 * @property string|null $excerpt
 * @property string|null $content
 * @property string|null $image
 * @property string|null $image_alt
 * @property string|null $seo_title
 * @property string|null $seo_description
 * @property bool $is_published
 * @property Carbon|null $published_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read int $read_time
 */
#[Fillable(['user_id', 'title', 'slug', 'excerpt', 'content', 'image', 'image_alt', 'seo_title', 'seo_description', 'is_published', 'published_at'])]
class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory;

    use HasUniqueSlug;

    /**
     * Average adult reading speed, used to derive the "N min read" label.
     */
    private const WORDS_PER_MINUTE = 200;

    /** @var list<string> */
    protected $appends = ['read_time'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @param  Builder<Post>  $query
     * @return Builder<Post>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true)
            ->where(function (Builder $query): void {
                $query->whereNull('published_at')->orWhere('published_at', '<=', now());
            });
    }

    public function isPublished(): bool
    {
        return $this->is_published && (! $this->published_at || $this->published_at->isPast());
    }

    /**
     * Reading time in whole minutes, derived from the post body.
     *
     * @return Attribute<int<1, max>, never>
     */
    protected function readTime(): Attribute
    {
        return Attribute::get(function (): int {
            $words = Str::of((string) $this->content)
                ->stripTags()
                ->squish()
                ->explode(' ')
                ->filter()
                ->count();

            return max(1, (int) ceil($words / self::WORDS_PER_MINUTE));
        });
    }
}
