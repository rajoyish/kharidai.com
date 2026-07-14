<?php

namespace App\Models;

use App\Enums\MenuLinkType;
use App\Enums\MenuLocation;
use Database\Factories\MenuItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * One node of a navigation menu. Items are scoped to a `location` and nest a
 * single level via `parent_id`, which the storefront renders as a dropdown.
 *
 * @property int $id
 * @property MenuLocation $location
 * @property int|null $parent_id
 * @property string $label
 * @property MenuLinkType $link_type
 * @property string|null $url
 * @property int|null $page_id
 * @property bool $opens_in_new_tab
 * @property bool $is_active
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Page|null $page
 * @property-read Collection<int, MenuItem> $children
 */
#[Fillable(['location', 'parent_id', 'label', 'link_type', 'url', 'page_id', 'opens_in_new_tab', 'is_active', 'sort_order'])]
class MenuItem extends Model
{
    /** @use HasFactory<MenuItemFactory> */
    use HasFactory;

    /**
     * Menus nest exactly one level: a top-level item and its dropdown. Deeper
     * trees are rejected rather than silently flattened, because neither the
     * header nor the footer has an affordance for a third level.
     */
    public const MAX_DEPTH = 2;

    public const CACHE_KEY_PREFIX = 'storefront_menu_';

    protected static function booted(): void
    {
        // New items join the end of their branch rather than jumping to the front.
        static::creating(function (MenuItem $item): void {
            if (! $item->getAttribute('sort_order')) {
                $item->sort_order = (int) static::query()
                    ->where('location', $item->location)
                    ->where('parent_id', $item->parent_id)
                    ->max('sort_order') + 1;
            }
        });

        static::saved(fn (MenuItem $item) => static::forgetCache($item->location));
        static::deleted(fn (MenuItem $item) => static::forgetCache($item->location));
    }

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'location' => MenuLocation::class,
            'link_type' => MenuLinkType::class,
            'opens_in_new_tab' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public static function forgetCache(MenuLocation $location): void
    {
        Cache::forget(self::CACHE_KEY_PREFIX.$location->value);
    }

    /**
     * Menus are read on nearly every storefront request, so each location's tree
     * is cached until an item — or a page an item points at — changes.
     */
    public static function flushCache(): void
    {
        foreach (MenuLocation::cases() as $location) {
            self::forgetCache($location);
        }
    }

    /** @return BelongsTo<Page, $this> */
    public function page(): BelongsTo
    {
        return $this->belongsTo(Page::class);
    }

    /** @return BelongsTo<MenuItem, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(MenuItem::class, 'parent_id');
    }

    /** @return HasMany<MenuItem, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(MenuItem::class, 'parent_id')->ordered();
    }

    /**
     * Menu order, with `id` as a stable tiebreaker for equal sort values.
     *
     * @param  Builder<MenuItem>  $query
     * @return Builder<MenuItem>
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    /**
     * @param  Builder<MenuItem>  $query
     * @return Builder<MenuItem>
     */
    public function scopeForLocation(Builder $query, MenuLocation $location): Builder
    {
        return $query->where('location', $location);
    }

    /**
     * The destination this item points at, or `null` when it cannot resolve — a
     * page-linked item whose page is missing or unpublished, or a custom item
     * with a blank URL. The storefront drops unresolvable items so a menu never
     * renders a dead link.
     */
    public function resolveHref(): ?string
    {
        if ($this->link_type === MenuLinkType::Page) {
            $page = $this->page;

            return $page && $page->isPublished() ? '/'.$page->slug : null;
        }

        return Str::of((string) $this->url)->trim()->value() ?: null;
    }
}
