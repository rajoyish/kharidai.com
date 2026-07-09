<?php

namespace App\Models;

use App\Models\Concerns\HasUniqueSlug;
use Database\Factories\PageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string|null $content
 * @property string|null $image
 * @property string|null $image_alt
 * @property string|null $seo_title
 * @property string|null $seo_description
 * @property bool $is_published
 * @property Carbon|null $published_at
 * @property int $sort_order
 * @property bool $show_in_nav
 * @property bool $show_in_footer
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['title', 'slug', 'content', 'image', 'image_alt', 'seo_title', 'seo_description', 'is_published', 'published_at', 'sort_order', 'show_in_nav', 'show_in_footer'])]
class Page extends Model
{
    /** @use HasFactory<PageFactory> */
    use HasFactory;

    use HasUniqueSlug;

    /**
     * Static pages resolve from the root path (`/{slug}`), so these slugs are
     * off limits: they belong to first-party routes that must keep priority.
     *
     * @var list<string>
     */
    public const RESERVED_SLUGS = [
        'account',
        'admin',
        'api',
        'auth',
        'blog',
        'cart',
        'categories',
        'checkout',
        'confirm-password',
        'dashboard',
        'digital-products',
        'email',
        'forgot-password',
        'login',
        'logout',
        'notifications',
        'orders',
        'physical-products',
        'products',
        'register',
        'reset-password',
        'services',
        'settings',
        'storage',
        'subscriptions',
        'two-factor-challenge',
        'up',
        'user',
        'verify-email',
    ];

    protected static function booted(): void
    {
        // New pages join the end of the menu rather than jumping to the front.
        static::creating(function (Page $page): void {
            if (! $page->getAttribute('sort_order')) {
                $page->sort_order = (int) static::max('sort_order') + 1;
            }
        });

        static::saved(fn () => Cache::forget('storefront_pages'));
        static::deleted(fn () => Cache::forget('storefront_pages'));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'published_at' => 'datetime',
            'show_in_nav' => 'boolean',
            'show_in_footer' => 'boolean',
        ];
    }

    /**
     * Menu order, with `id` as a stable tiebreaker for equal sort values.
     *
     * @param  Builder<Page>  $query
     * @return Builder<Page>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * @param  Builder<Page>  $query
     * @return Builder<Page>
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
}
