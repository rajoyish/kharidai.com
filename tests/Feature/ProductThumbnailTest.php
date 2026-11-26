<?php

use App\Models\Product;
use App\Services\Images\ProductThumbnailer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

/**
 * Put a real PNG of the given size on the fake public disk.
 */
function storeProductImage(string $path, int $width = 1200, int $height = 630): string
{
    Storage::disk('public')->put($path, UploadedFile::fake()->image('upload.png', $width, $height)->getContent());

    return $path;
}

it('creates a square webp thumbnail when a product gets an image', function () {
    $product = Product::factory()->create(['image' => storeProductImage('products/canva.png')]);

    expect($product->image_thumb)->toMatch('#^products/thumbs/canva-[0-9a-f]{8}\.webp$#');
    Storage::disk('public')->assertExists($product->image_thumb);

    $size = getimagesizefromstring(Storage::disk('public')->get($product->image_thumb));
    expect($size[0])->toBe(ProductThumbnailer::SIZE)
        ->and($size[1])->toBe(ProductThumbnailer::SIZE)
        ->and($size['mime'])->toBe('image/webp');
});

it('crops a product template image to its white disc, leaving out the gradient', function () {
    // The template: a green background with a white disc 80% of the height
    // across, centred a little below the middle.
    $image = imagecreatetruecolor(1200, 630);
    imagefill($image, 0, 0, (int) imagecolorallocate($image, 60, 170, 90));
    imagefilledellipse($image, 600, 337, 504, 504, (int) imagecolorallocate($image, 240, 240, 240));
    ob_start();
    imagepng($image);
    Storage::disk('public')->put('products/template.png', (string) ob_get_clean());

    $product = Product::factory()->create(['image' => 'products/template.png']);
    $thumbnail = imagecreatefromstring(Storage::disk('public')->get($product->image_thumb));

    // Where the round frame meets the thumbnail's edges, it must show disc, not background.
    $edge = ProductThumbnailer::SIZE - 2;
    $middle = intdiv(ProductThumbnailer::SIZE, 2);
    foreach ([[$middle, 1], [1, $middle], [$edge, $middle], [$middle, $edge]] as [$x, $y]) {
        $green = (imagecolorat($thumbnail, $x, $y) >> 8) & 255;
        $red = (imagecolorat($thumbnail, $x, $y) >> 16) & 255;
        expect($red)->toBeGreaterThan(200, "pixel {$x},{$y} is background, not disc")
            ->and($green)->toBeGreaterThan(200);
    }
});

it('never scales a small image up', function () {
    $product = Product::factory()->create(['image' => storeProductImage('products/tiny.png', 80, 40)]);

    $size = getimagesizefromstring(Storage::disk('public')->get($product->image_thumb));
    expect($size[0])->toBe(40)->and($size[1])->toBe(40);
});

it('replaces the thumbnail with the image and removes the old one', function () {
    $product = Product::factory()->create(['image' => storeProductImage('products/old.png')]);
    $oldThumbnail = $product->image_thumb;

    $product->update(['image' => storeProductImage('products/new.png')]);

    expect($product->image_thumb)->toStartWith('products/thumbs/new-');
    Storage::disk('public')->assertExists($product->image_thumb);
    Storage::disk('public')->assertMissing($oldThumbnail);
});

it('drops the thumbnail when the image is removed or the product deleted', function (string $action) {
    $product = Product::factory()->create(['image' => storeProductImage('products/gone.png')]);
    $thumbnail = $product->image_thumb;

    $action === 'cleared' ? $product->update(['image' => null]) : $product->delete();

    Storage::disk('public')->assertMissing($thumbnail);
    if ($action === 'cleared') {
        expect($product->image_thumb)->toBeNull();
    }
})->with(['cleared', 'deleted']);

it('saves the product without a thumbnail when the image cannot be read', function () {
    Storage::disk('public')->put('products/broken.png', 'not an image');

    $product = Product::factory()->create(['image' => 'products/broken.png']);

    expect($product->image_thumb)->toBeNull();
});

it('backfills thumbnails only for products missing one', function () {
    $missing = Product::factory()->create(['image' => storeProductImage('products/legacy.png')]);
    Storage::disk('public')->delete($missing->image_thumb);
    $missing->forceFill(['image_thumb' => null])->saveQuietly();

    $current = Product::factory()->create(['image' => storeProductImage('products/current.png')]);
    $currentModified = Storage::disk('public')->lastModified($current->image_thumb);
    Product::factory()->create(['image' => null]);

    $this->artisan('products:generate-thumbnails')
        ->expectsOutputToContain('Generated 1 product thumbnail(s).')
        ->assertSuccessful();

    expect($missing->fresh()->image_thumb)->toStartWith('products/thumbs/legacy-');
    Storage::disk('public')->assertExists($missing->fresh()->image_thumb);
    expect(Storage::disk('public')->lastModified($current->image_thumb))->toBe($currentModified);
});

it('gives a regenerated thumbnail a new file name and removes the old file', function () {
    $product = Product::factory()->create(['image' => storeProductImage('products/redo.png')]);
    $stale = 'products/thumbs/redo-00000000.webp';
    Storage::disk('public')->move($product->image_thumb, $stale);
    $product->forceFill(['image_thumb' => $stale])->saveQuietly();

    $this->artisan('products:generate-thumbnails', ['--force' => true])->assertSuccessful();

    expect($product->fresh()->image_thumb)->not->toBe($stale);
    Storage::disk('public')->assertExists($product->fresh()->image_thumb);
    Storage::disk('public')->assertMissing($stale);
});
