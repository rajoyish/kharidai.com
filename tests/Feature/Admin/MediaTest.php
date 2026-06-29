<?php

use App\Models\Media;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('can list media', function () {
    Media::create([
        'file_name' => 'test.jpg',
        'file_path' => 'media/test.jpg',
        'url' => 'http://localhost/storage/media/test.jpg',
        'disk' => 'public',
    ]);

    $response = $this->actingAs($this->admin)->get('/admin/media');

    $response->assertSuccessful();
});

it('can upload media', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->image('image.jpg');

    $response = $this->actingAs($this->admin)->post('/admin/media', [
        'file' => $file,
    ]);

    $response->assertSuccessful();
    $this->assertDatabaseHas('media', [
        'file_name' => 'image.jpg',
        'disk' => 'public',
    ]);
});

it('can delete media', function () {
    Storage::fake('public');
    
    $file = UploadedFile::fake()->image('image.jpg');
    $path = $file->store('media', 'public');
    
    $media = Media::create([
        'file_name' => 'image.jpg',
        'file_path' => $path,
        'url' => Storage::disk('public')->url($path),
        'disk' => 'public',
    ]);

    $response = $this->actingAs($this->admin)->delete('/admin/media/' . $media->id);

    $response->assertSuccessful();
    $this->assertDatabaseMissing('media', [
        'id' => $media->id,
    ]);
});
