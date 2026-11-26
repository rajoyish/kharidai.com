<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Services\Images\ProductThumbnailer;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Backfills storefront thumbnails for products whose image predates them.
 *
 * New uploads get theirs from ProductObserver. Without --force only products
 * missing a thumbnail are touched, so the deploy can run this every time.
 */
#[Signature('products:generate-thumbnails {--force : Regenerate thumbnails that already exist}')]
#[Description('Create the small WebP thumbnail for product images that do not have one yet.')]
class GenerateProductThumbnails extends Command
{
    public function handle(ProductThumbnailer $thumbnailer): int
    {
        $generated = 0;
        $skipped = 0;

        Product::query()
            ->whereNotNull('image')
            ->where('image', '!=', '')
            ->unless($this->option('force'), fn ($query) => $query->whereNull('image_thumb'))
            ->select(['id', 'image', 'image_thumb'])
            ->chunkById(100, function ($products) use ($thumbnailer, &$generated, &$skipped): void {
                foreach ($products as $product) {
                    $thumbnail = $thumbnailer->generate($product->image);

                    if ($thumbnail === null) {
                        $skipped++;

                        continue;
                    }

                    $previous = $product->image_thumb;
                    $product->forceFill(['image_thumb' => $thumbnail])->saveQuietly();

                    // A forced rerun that changed the output wrote a new file
                    // name (it carries a content hash); drop the old file.
                    if ($previous !== null && $previous !== $thumbnail) {
                        $thumbnailer->delete($previous);
                    }
                    $generated++;
                }
            });

        $this->info("Generated {$generated} product thumbnail(s).");

        if ($skipped > 0) {
            $this->warn("Skipped {$skipped} image(s) that could not be read; see the log.");
        }

        return self::SUCCESS;
    }
}
