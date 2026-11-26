<?php

namespace App\Services\Images;

use GdImage;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Makes the small square WebP the storefront shows where a product appears as
 * an icon (the hero marquee's 56px circles), so those spots do not download
 * the full upload — typically a 1200×630 PNG of a few hundred KB — for a few
 * thousand pixels.
 *
 * Plain GD, no image package. When the host's GD lacks WebP, or an upload is
 * a format GD cannot read, it makes no thumbnail and the storefront falls back
 * to the full image.
 */
class ProductThumbnailer
{
    /** Twice the largest rendered size, for high-density screens. */
    public const int SIZE = 128;

    public const string DIRECTORY = 'products/thumbs';

    private const int WEBP_QUALITY = 80;

    /**
     * The shop's 1200×630 product template puts the logo on a white disc,
     * 80% of the image height across and centred a little below the middle,
     * over a green-to-blue gradient. Cropping the plain centre square shows
     * that gradient and the crown around the disc's edge, so for images in the
     * template's shape the crop is a square just inside the disc instead; the
     * circle then shows only the disc and its logo.
     */
    private const float TEMPLATE_ASPECT_RATIO = 1200 / 630;

    private const float TEMPLATE_ASPECT_TOLERANCE = 0.05;

    /** Crop side as a share of the image height: inside the 0.80 disc. */
    private const float TEMPLATE_CROP_HEIGHT_SHARE = 0.76;

    /** The disc's centre as a share of the image height. */
    private const float TEMPLATE_CENTRE_HEIGHT_SHARE = 0.535;

    /**
     * Write the thumbnail for an image on the public disk.
     *
     * @return string|null the thumbnail's path on the public disk, or null when none could be made
     */
    public function generate(string $imagePath): ?string
    {
        if (! function_exists('imagewebp')) {
            return null;
        }

        $disk = $this->disk();
        $contents = $disk->get($imagePath);

        if ($contents === null) {
            Log::warning('Product thumbnail skipped: image file is missing.', ['image' => $imagePath]);

            return null;
        }

        $source = @imagecreatefromstring($contents);

        if ($source === false) {
            Log::warning('Product thumbnail skipped: GD cannot read the image.', ['image' => $imagePath]);

            return null;
        }

        $webp = $this->encodeSquareWebp($source);

        if ($webp === null) {
            return null;
        }

        // The content hash gives a regenerated thumbnail a new URL, so browsers
        // and caches holding the old one cannot keep showing it.
        $thumbnailPath = self::DIRECTORY.'/'.pathinfo($imagePath, PATHINFO_FILENAME).'-'.substr(hash('xxh3', $webp), 0, 8).'.webp';
        $disk->put($thumbnailPath, $webp);

        return $thumbnailPath;
    }

    public function delete(?string $thumbnailPath): void
    {
        if ($thumbnailPath !== null && $thumbnailPath !== '') {
            $this->disk()->delete($thumbnailPath);
        }
    }

    /**
     * Crop a square — the template's disc, or else the centre, as
     * `object-cover` does in a circle — and scale it down (never up) to SIZE,
     * keeping any transparency.
     */
    private function encodeSquareWebp(GdImage $source): ?string
    {
        $width = imagesx($source);
        $height = imagesy($source);
        ['side' => $side, 'x' => $cropX, 'y' => $cropY] = $this->cropSquare($width, $height);
        $size = min(self::SIZE, $side);

        $thumbnail = imagecreatetruecolor($size, $size);
        imagealphablending($thumbnail, false);
        imagesavealpha($thumbnail, true);
        imagefill($thumbnail, 0, 0, (int) imagecolorallocatealpha($thumbnail, 0, 0, 0, 127));

        imagecopyresampled(
            $thumbnail,
            $source,
            0,
            0,
            $cropX,
            $cropY,
            $size,
            $size,
            $side,
            $side,
        );

        ob_start();
        $encoded = imagewebp($thumbnail, null, self::WEBP_QUALITY);
        $webp = ob_get_clean();

        return $encoded && is_string($webp) && $webp !== '' ? $webp : null;
    }

    /**
     * @return array{side: int, x: int, y: int}
     */
    private function cropSquare(int $width, int $height): array
    {
        $isTemplate = abs($width / $height - self::TEMPLATE_ASPECT_RATIO) <= self::TEMPLATE_ASPECT_TOLERANCE;

        if (! $isTemplate) {
            $side = min($width, $height);

            return ['side' => $side, 'x' => intdiv($width - $side, 2), 'y' => intdiv($height - $side, 2)];
        }

        $side = (int) round($height * self::TEMPLATE_CROP_HEIGHT_SHARE);
        $centreY = (int) round($height * self::TEMPLATE_CENTRE_HEIGHT_SHARE);

        return [
            'side' => $side,
            'x' => intdiv($width - $side, 2),
            'y' => max(0, min($height - $side, $centreY - intdiv($side, 2))),
        ];
    }

    private function disk(): Filesystem
    {
        return Storage::disk('public');
    }
}
