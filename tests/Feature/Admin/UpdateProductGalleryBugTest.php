<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

it('can update gallery by removing existing and adding new', function () {
    Storage::fake('public');

    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create(['slug' => 'test-product']);
    $gallery = $product->galleries()->create([
        'image_path' => 'products/gallery/old.jpg',
        'sort_order' => 0,
    ]);

    $newFile = UploadedFile::fake()->image('new.jpg')->size(500);

    $response = $this->actingAs($admin)
        ->put(route('admin.products.update', $product), [
            'title' => 'Updated Product',
            'update_galleries' => 1,
            'existing_galleries' => [], // removed the old one
            'gallery_orders' => ['new:0'],
            'new_galleries' => [$newFile],
        ]);

    $response->assertRedirect(route('admin.products.index'));

    // The old gallery should be deleted
    expect($product->galleries()->count())->toBe(1);
    expect($product->galleries()->first()->image_path)->not->toBe('products/gallery/old.jpg');
});
