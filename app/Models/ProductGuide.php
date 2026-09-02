<?php

namespace App\Models;

use Database\Factories\ProductGuideFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * A reusable, purchase-gated delivery guide for a product.
 *
 * The same guide is read by every customer who bought the product, so it holds
 * only the instructions that never change. Anything that differs per buyer — an
 * email, a password, an activation link — stays in {@see OrderCredential}.
 *
 * Deliberately not a {@see Post}: a post carries a slug and is served by the
 * blog index, the storefront search and the sitemap. A guide has no slug and no
 * public route, so there is no query anywhere that could publish one by
 * forgetting to filter it out. The reuse with the blog is the Novel editor and
 * the media gallery, not the table.
 *
 * @property int $id
 * @property int $product_id
 * @property string $title
 * @property string|null $content
 * @property bool $is_published
 * @property int $sort_order
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Product $product
 */
#[Fillable(['product_id', 'title', 'content', 'is_published', 'sort_order'])]
class ProductGuide extends Model
{
    /** @use HasFactory<ProductGuideFactory> */
    use HasFactory;

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * The gated images this guide embeds.
     *
     * Kept in step with the body by {@see syncEmbeddedMedia()} on every save,
     * because it is what decides who may fetch each file. A screenshot that has
     * been edited out of the body loses its readers with it.
     *
     * @return BelongsToMany<GuideMedia, $this>
     */
    public function media(): BelongsToMany
    {
        return $this->belongsToMany(GuideMedia::class, 'product_guide_media');
    }

    /**
     * Re-read the body and record which gated images it now embeds.
     *
     * Matches on the path rather than the whole URL: the stored body outlives
     * any one APP_URL, and a body written on localhost has to keep working in
     * production.
     */
    public function syncEmbeddedMedia(): void
    {
        preg_match_all('#/guide-media/(\d+)#', (string) $this->content, $matches);

        $this->media()->sync(array_unique(array_map('intval', $matches[1])));
    }

    /**
     * Guides an admin has released. A draft is visible in the admin only.
     *
     * @param  Builder<ProductGuide>  $query
     * @return Builder<ProductGuide>
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    /**
     * The order guides are read in: the admin's chosen position first, then
     * oldest first so the sequence is stable when positions tie.
     *
     * @param  Builder<ProductGuide>  $query
     * @return Builder<ProductGuide>
     */
    public function scopeInReadingOrder(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}
