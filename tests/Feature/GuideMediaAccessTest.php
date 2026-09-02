<?php

use App\Enums\ProductType;
use App\Models\GuideMedia;
use App\Models\Product;
use App\Models\ProductGuide;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Storage::fake('public');
});

/**
 * Upload an image the way the guide editor does, and return its row.
 */
function uploadGuideImage(User $admin): GuideMedia
{
    test()->actingAs($admin)
        ->post(route('admin.guide-media.store'), [
            'file' => UploadedFile::fake()->image('activation-screen.png'),
        ])
        ->assertSuccessful();

    return GuideMedia::latest('id')->firstOrFail();
}

/**
 * A released guide for the product, embedding the image.
 */
function guideEmbedding(Product $product, GuideMedia $media, bool $published = true): ProductGuide
{
    $guide = ProductGuide::factory()->create([
        'product_id' => $product->id,
        'content' => '<p>Open this screen:</p><img src="'.route('guide-media.show', $media).'">',
        'is_published' => $published,
    ]);

    $guide->syncEmbeddedMedia();

    return $guide;
}

it('stores a guide image off the public disk', function () {
    $media = uploadGuideImage(User::factory()->create(['is_admin' => true]));

    expect($media->disk)->toBe('local');
    expect(Storage::disk('local')->exists($media->file_path))->toBeTrue();
    expect(Storage::disk('public')->exists($media->file_path))->toBeFalse();

    // The editor embeds the gated route, never a /storage/ path, and does it
    // relatively so the body survives being written under a different APP_URL.
    expect($media->url)
        ->toBe('/guide-media/'.$media->id)
        ->not->toContain('/storage/');
});

it('serves a guide image to a buyer whose order is paid', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($product, $media);
    orderFor($buyer, $product);

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertSuccessful()
        ->assertHeader('Content-Type', $media->mime_type);
});

it('refuses a guide image while the order is unpaid', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($product, $media);
    orderFor($buyer, $product, status: 'pending');

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertForbidden();
});

it('refuses a guide image to someone who never bought the product', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($product, $media);

    $this->actingAs(User::factory()->create())
        ->get(route('guide-media.show', $media))
        ->assertForbidden();
});

it('refuses a guide image to a buyer of a different product', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $guidedProduct = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($guidedProduct, $media);
    orderFor($buyer, Product::factory()->create());

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertForbidden();
});

it('refuses a guide image embedded only in a draft', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($product, $media, published: false);
    orderFor($buyer, $product);

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertForbidden();

    $this->actingAs($admin)
        ->get(route('guide-media.show', $media))
        ->assertSuccessful();
});

it('refuses a guide image no released guide embeds any more', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    $guide = guideEmbedding($product, $media);
    orderFor($buyer, $product);

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertSuccessful();

    // The admin edits the screenshot out of the guide.
    $this->actingAs($admin)
        ->put(route('admin.products.guides.update', [$product, $guide]), [
            'title' => $guide->title,
            'content' => '<p>No screenshot any more.</p>',
            'is_published' => true,
        ])
        ->assertRedirect();

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertForbidden();
});

it('stops serving a guide image once its product becomes a service', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($product, $media);
    orderFor($buyer, $product);

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertSuccessful();

    $product->update(['type' => ProductType::Service]);

    $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertForbidden();
});

it('turns guests away from a guide image', function () {
    // Built directly rather than through the upload endpoint: uploading would
    // authenticate this test as an admin for everything that followed.
    $media = GuideMedia::create([
        'file_name' => 'activation-screen.png',
        'file_path' => 'guide-media/activation-screen.png',
        'disk' => 'local',
        'mime_type' => 'image/png',
        'size' => 1024,
    ]);

    $this->get(route('guide-media.show', $media))->assertRedirect(route('login'));
});

it('never lets a shared cache keep a guide image', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($product, $media);
    orderFor($buyer, $product);

    $cacheControl = $this->actingAs($buyer)
        ->get(route('guide-media.show', $media))
        ->assertSuccessful()
        ->headers->get('Cache-Control');

    expect($cacheControl)->toContain('private')->not->toContain('public');
});

it('records the images a guide embeds when it is saved', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $product = Product::factory()->create();
    $media = uploadGuideImage($admin);

    $this->actingAs($admin)
        ->post(route('admin.products.guides.store', $product), [
            'title' => 'How to activate',
            'content' => '<img src="'.route('guide-media.show', $media).'">',
            'is_published' => true,
        ])
        ->assertRedirect();

    expect($product->guides()->first()->media)->toHaveCount(1);
});

it('does not serve a guide image through the framework storage route', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $buyer = User::factory()->create();
    $product = Product::factory()->create();

    $media = uploadGuideImage($admin);
    guideEmbedding($product, $media);
    orderFor($buyer, $product);

    /*
     * `serve => true` on the local disk registers a framework route at
     * /storage/{path} that streams straight off storage/app/private, bypassing
     * GuideMediaPolicy entirely. It only refuses because the disk has no
     * `visibility => public`, so an unsigned request needs a signature it does
     * not have — a one-line config change away from becoming an open door.
     * Rejected for the buyer too: this path answers to nobody.
     */
    $this->get('/storage/'.$media->file_path)->assertForbidden();

    $this->actingAs($buyer)
        ->get('/storage/'.$media->file_path)
        ->assertForbidden();
});

it('keeps guide image uploads to admins', function () {
    $this->actingAs(User::factory()->create())
        ->post(route('admin.guide-media.store'), [
            'file' => UploadedFile::fake()->image('leak.png'),
        ])
        ->assertForbidden();

    expect(GuideMedia::count())->toBe(0);
});

it('keeps the guide image list and delete to admins', function () {
    $media = uploadGuideImage(User::factory()->create(['is_admin' => true]));
    $outsider = User::factory()->create();

    $this->actingAs($outsider)->get(route('admin.guide-media.index'))->assertForbidden();
    $this->actingAs($outsider)->delete(route('admin.guide-media.destroy', $media))->assertForbidden();

    expect(GuideMedia::find($media->id))->not->toBeNull();
});

it('deletes the file along with the guide image row', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $media = uploadGuideImage($admin);

    $this->actingAs($admin)
        ->delete(route('admin.guide-media.destroy', $media))
        ->assertSuccessful();

    expect(Storage::disk('local')->exists($media->file_path))->toBeFalse();
    expect(GuideMedia::find($media->id))->toBeNull();
});
