<?php

namespace App\Models;

use App\Http\Controllers\GuideMediaController;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Carbon;

/**
 * An image embedded in a product delivery guide.
 *
 * Deliberately not a {@see Media} row. Media lives on the `public` disk behind
 * a symlink, so its URL answers to anyone who has it — fine for a blog post,
 * wrong for a screenshot of someone's account setup. These files sit on the
 * `local` disk, outside the web root, and are only ever read back through
 * {@see GuideMediaController::show()}, which checks the
 * viewer bought the product first.
 *
 * @property int $id
 * @property string $file_name
 * @property string $file_path
 * @property string $disk
 * @property string $mime_type
 * @property int $size
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read string $url
 */
#[Fillable(['file_name', 'file_path', 'disk', 'mime_type', 'size'])]
class GuideMedia extends Model
{
    protected $table = 'guide_media';

    /** @var list<string> */
    protected $appends = ['url'];

    /**
     * The guides that embed this image. Populated from the guide body on save,
     * and the only reason anyone is ever allowed to read the file.
     *
     * @return BelongsToMany<ProductGuide, $this>
     */
    public function guides(): BelongsToMany
    {
        return $this->belongsToMany(ProductGuide::class, 'product_guide_media');
    }

    /**
     * The gated route the editor embeds and the browser fetches.
     *
     * Root-relative on purpose. The URL is written into a guide body and stored
     * there for good, so an absolute one would pin that body to whichever
     * APP_URL was set when it was typed — a guide drafted on localhost would
     * ship to production with images pointing at the author's laptop.
     *
     * @return Attribute<string, never>
     */
    protected function url(): Attribute
    {
        return Attribute::get(fn (): string => route('guide-media.show', $this, absolute: false));
    }
}
