<?php

use App\Enums\EngagementSource;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('lists engagements', function () {
    ServiceEngagement::factory()->count(3)->create();

    $this->actingAs($this->admin)->get('/admin/services')->assertSuccessful();
});

it('shows the assign form', function () {
    $this->actingAs($this->admin)
        ->get('/admin/services/create')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Services/Create')
            ->has('users')
            ->has('services')
            // The status <select> maps over this prop; omitting it crashes the page.
            ->has('statuses')
        );
});

it('assigns a service to a user', function () {
    $client = User::factory()->create();
    $service = Product::factory()->service()->create();
    $variant = ProductVariant::factory()->create([
        'product_id' => $service->id,
        'price_npr' => 8000,
    ]);

    $this->actingAs($this->admin)->post('/admin/services', [
        'user_id' => $client->id,
        'product_id' => $service->id,
        'product_variant_id' => $variant->id,
        'brief_note' => 'Kickoff next week',
    ])->assertRedirect();

    $engagement = ServiceEngagement::firstOrFail();

    expect($engagement->user_id)->toBe($client->id)
        ->and($engagement->source)->toBe(EngagementSource::Admin)
        ->and($engagement->created_by)->toBe($this->admin->id)
        ->and($engagement->price_npr)->toBe(8000.0)
        ->and($engagement->brief)->toBe(['note' => 'Kickoff next week']);
});

it('can assign a hidden service (visibility does not block assignment)', function () {
    $client = User::factory()->create();
    $hiddenService = Product::factory()->service()->hidden()->create();

    $this->actingAs($this->admin)->post('/admin/services', [
        'user_id' => $client->id,
        'product_id' => $hiddenService->id,
        'price_npr' => 45000,
        'status' => 'in_progress',
    ])->assertRedirect();

    $this->assertDatabaseHas('service_engagements', [
        'user_id' => $client->id,
        'product_id' => $hiddenService->id,
        'source' => 'admin',
        'status' => 'in_progress',
    ]);
});

it('rejects assigning a non-service product', function () {
    $client = User::factory()->create();
    $digital = Product::factory()->create(); // digital

    $this->actingAs($this->admin)->post('/admin/services', [
        'user_id' => $client->id,
        'product_id' => $digital->id,
        'price_npr' => 1000,
        'status' => 'pending',
    ])->assertSessionHasErrors('product_id');
});

it('cancels an engagement through a valid transition', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", ['status' => 'cancelled'])
        ->assertRedirect();

    expect($engagement->refresh()->status->value)->toBe('cancelled');
});

it('rejects an illegal status transition', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", ['status' => 'completed'])
        ->assertRedirect();

    // in_progress cannot jump straight to completed.
    expect($engagement->refresh()->status->value)->toBe('in_progress');
});

it('blocks non-admins from the services area', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/admin/services')->assertForbidden();
});
