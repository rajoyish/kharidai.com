<?php

use App\Models\Page;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
    $this->admin = User::factory()->create(['is_admin' => true]);
});

/** Strips the uniqueness suffix, e.g. `banner-6871f3a91b2cd.jpg` -> `banner.jpg`. */
function seoNameWithoutSuffix(string $path): string
{
    return preg_replace('/-[a-z0-9]+(\.\w+)$/', '$1', basename($path)) ?? '';
}

it('names a product hero image after the product title and the uploaded filename', function () {
    $response = $this->actingAs($this->admin)->post('/admin/products', [
        'title' => 'Blue Cotton Shirt',
        'description' => 'A shirt',
        'image' => UploadedFile::fake()->image('Summer Photo #1.jpg'),
        'in_stock' => true,
    ]);

    $response->assertRedirect();

    $image = Product::firstOrFail()->image;

    expect($image)->toStartWith('products/');
    expect(seoNameWithoutSuffix($image))->toBe('blue-cotton-shirt-summer-photo-1.jpg');
    Storage::disk('public')->assertExists($image);
});

it('names product gallery images after the product title and the uploaded filename', function () {
    $this->actingAs($this->admin)->post('/admin/products', [
        'title' => 'Blue Cotton Shirt',
        'description' => 'A shirt',
        'in_stock' => true,
        'update_galleries' => true,
        'new_galleries' => [UploadedFile::fake()->image('Front View.jpg')],
        'gallery_orders' => ['new:0'],
    ])->assertRedirect();

    $path = Product::firstOrFail()->galleries()->firstOrFail()->image_path;

    expect($path)->toStartWith('products/gallery/');
    expect(seoNameWithoutSuffix($path))->toBe('blue-cotton-shirt-front-view.jpg');
    Storage::disk('public')->assertExists($path);
});

it('names a page hero image after the page title and the uploaded filename', function () {
    $this->actingAs($this->admin)->post('/admin/pages', [
        'title' => 'About Us',
        'content' => 'Content',
        'image' => UploadedFile::fake()->image('Team Photo.jpg', 1200, 630),
    ])->assertRedirect();

    $image = Page::firstOrFail()->image;

    expect($image)->toStartWith('pages/');
    expect(seoNameWithoutSuffix($image))->toBe('about-us-team-photo.jpg');
    Storage::disk('public')->assertExists($image);
});

it('names a media library upload after the uploaded filename', function () {
    $response = $this->actingAs($this->admin)->post('/admin/media', [
        'file' => UploadedFile::fake()->image('Hero Banner 2026.jpg'),
    ]);

    $response->assertSuccessful();

    $path = $response->json('file_path');

    expect($path)->toStartWith('media/');
    expect(seoNameWithoutSuffix($path))->toBe('hero-banner-2026.jpg');
    Storage::disk('public')->assertExists($path);
});

it('keeps identically named uploads from overwriting each other', function () {
    $paths = collect(range(1, 2))->map(function () {
        return $this->actingAs($this->admin)->post('/admin/media', [
            'file' => UploadedFile::fake()->image('banner.jpg'),
        ])->json('file_path');
    });

    expect($paths->unique())->toHaveCount(2);

    $paths->each(fn (string $path) => Storage::disk('public')->assertExists($path));
});

it('falls back to a generic name when the filename slugifies to nothing', function () {
    $response = $this->actingAs($this->admin)->post('/admin/media', [
        'file' => UploadedFile::fake()->image('???.jpg'),
    ]);

    $response->assertSuccessful();

    expect(seoNameWithoutSuffix($response->json('file_path')))->toBe('image.jpg');
});
