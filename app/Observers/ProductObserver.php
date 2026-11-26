<?php

namespace App\Observers;

use App\Models\Product;
use App\Services\Images\ProductThumbnailer;
use Illuminate\Support\Facades\DB;

/**
 * Keeps `image_thumb` in step with `image`, whichever code path sets it.
 *
 * Old thumbnail files are removed only once the change commits: an admin save
 * runs in a transaction, and deleting the file on a save that then rolls back
 * would leave the restored row pointing at nothing.
 */
class ProductObserver
{
    public function __construct(
        private readonly ProductThumbnailer $thumbnailer,
    ) {}

    public function saving(Product $product): void
    {
        if (! $product->isDirty('image')) {
            return;
        }

        $product->image_thumb = filled($product->image)
            ? $this->thumbnailer->generate($product->image)
            : null;
    }

    public function saved(Product $product): void
    {
        if (! $product->wasChanged('image_thumb')) {
            return;
        }

        $previousThumbnail = $product->getOriginal('image_thumb');

        if ($previousThumbnail !== null && $previousThumbnail !== $product->image_thumb) {
            DB::afterCommit(fn () => $this->thumbnailer->delete($previousThumbnail));
        }
    }

    public function deleted(Product $product): void
    {
        $thumbnail = $product->image_thumb;

        DB::afterCommit(fn () => $this->thumbnailer->delete($thumbnail));
    }
}
