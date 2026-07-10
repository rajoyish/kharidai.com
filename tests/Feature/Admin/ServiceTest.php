<?php

use App\Enums\EngagementSource;
use App\Enums\EngagementStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ServiceEngagement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

it('lists engagements with their lifecycle status', function () {
    ServiceEngagement::factory()->negotiation()->create();

    $this->actingAs($this->admin)
        ->get('/admin/services')
        ->assertSuccessful()
        // The Status column renders these; the payment status is separate.
        ->assertInertia(fn (Assert $page) => $page
            ->where('engagements.0.status', 'negotiation')
            ->where('engagements.0.status_label', 'Negotiation')
            ->etc()
        );
});

it('shows the assign form', function () {
    $this->actingAs($this->admin)
        ->get('/admin/services/create')
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Services/Create')
            // The client combobox and service select map over these props;
            // omitting either crashes the page.
            ->has('users')
            ->has('services')
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
    $variant = ProductVariant::factory()->create(['product_id' => $hiddenService->id]);

    $this->actingAs($this->admin)->post('/admin/services', [
        'user_id' => $client->id,
        'product_id' => $hiddenService->id,
        'product_variant_id' => $variant->id,
        'status' => 'in_progress',
    ])->assertRedirect();

    $this->assertDatabaseHas('service_engagements', [
        'user_id' => $client->id,
        'product_id' => $hiddenService->id,
        'source' => 'admin',
        'status' => 'in_progress',
    ]);
});

it('requires a package so the engagement is billable', function () {
    $client = User::factory()->create();
    $service = Product::factory()->service()->create();

    $this->actingAs($this->admin)->post('/admin/services', [
        'user_id' => $client->id,
        'product_id' => $service->id,
    ])->assertSessionHasErrors('product_variant_id');

    expect(ServiceEngagement::count())->toBe(0);
});

it('rejects a package that belongs to a different service', function () {
    $client = User::factory()->create();
    $service = Product::factory()->service()->create();
    $otherVariant = ProductVariant::factory()->create(); // belongs to another product

    $this->actingAs($this->admin)->post('/admin/services', [
        'user_id' => $client->id,
        'product_id' => $service->id,
        'product_variant_id' => $otherVariant->id,
    ])->assertSessionHasErrors('product_variant_id');
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

it('offers the next statuses on the engagement page, explaining the blocked ones', function () {
    // In progress may reach Negotiation, but only once a cost is calculated,
    // which happens when the invoice brief is saved.
    $engagement = ServiceEngagement::factory()->inProgress()->create([
        'calculated_cost_npr' => 0,
    ]);

    $this->actingAs($this->admin)
        ->get("/admin/services/{$engagement->id}")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('statusOptions.0.value', 'negotiation')
            ->where('statusOptions.0.blocked_reason', 'Save the invoice brief first so a cost is calculated.')
            // Cancelling is always available.
            ->where('statusOptions.1.value', 'cancelled')
            ->where('statusOptions.1.blocked_reason', null)
            ->etc()
        );
});

it('unblocks the next status once the invoice brief gives it a cost', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create([
        'calculated_cost_npr' => 8000,
    ]);

    $this->actingAs($this->admin)
        ->get("/admin/services/{$engagement->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('statusOptions.0.value', 'negotiation')
            ->where('statusOptions.0.blocked_reason', null)
            ->etc()
        );
});

it('signs the contract and moves the engagement on', function () {
    $engagement = ServiceEngagement::factory()->create([
        'status' => EngagementStatus::PendingContract,
        'contract_signed_at' => null,
        'advance_required_npr' => 0,
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/contract")
        ->assertRedirect();

    $engagement->refresh();
    expect($engagement->contract_signed_at)->not->toBeNull()
        ->and($engagement->status)->toBe(EngagementStatus::InProgress);
});

it('records an advance and begins the work', function () {
    $engagement = ServiceEngagement::factory()->create([
        'status' => EngagementStatus::AwaitingAdvance,
        'contract_signed_at' => now(),
        'advance_required_npr' => 3000,
        'advance_paid_npr' => 0,
    ]);

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/advance", ['amount_npr' => 3000])
        ->assertRedirect();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::InProgress);
});

it('cancels an engagement through a valid transition', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", ['status' => 'cancelled'])
        ->assertRedirect();

    expect($engagement->refresh()->status->value)->toBe('cancelled');
});

it('moves an agreed invoice to awaiting payment', function () {
    $engagement = ServiceEngagement::factory()->negotiation()->create([
        'agreed_price_npr' => 11000,
    ]);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", ['status' => 'awaiting_payment'])
        ->assertRedirect();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::AwaitingPayment);
});

it('blocks awaiting payment until a price is agreed', function () {
    $engagement = ServiceEngagement::factory()->negotiation()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", ['status' => 'awaiting_payment'])
        ->assertRedirect();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::Negotiation);
});

it('completes an engagement straight from negotiation once a price is agreed', function () {
    $engagement = ServiceEngagement::factory()->negotiation()->create([
        'agreed_price_npr' => 11000,
    ]);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", ['status' => 'completed'])
        ->assertRedirect();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::Completed);
});

it('completes an engagement that was awaiting payment', function () {
    $engagement = ServiceEngagement::factory()->awaitingPayment()->create();

    $this->actingAs($this->admin)
        ->post("/admin/services/{$engagement->id}/complete")
        ->assertRedirect();

    expect($engagement->refresh()->status)->toBe(EngagementStatus::Completed);
});

it('rejects an illegal status transition', function () {
    $engagement = ServiceEngagement::factory()->inProgress()->create();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/status", ['status' => 'completed'])
        ->assertRedirect();

    // in_progress cannot jump straight to completed.
    expect($engagement->refresh()->status->value)->toBe('in_progress');
});

it('surfaces the linked order payment receipt so payment can be verified', function () {
    $engagement = ServiceEngagement::factory()->awaitingPayment()->create();
    $order = Order::factory()->create(['user_id' => $engagement->user_id]);
    $orderItem = $order->items()->create([
        'product_variant_id' => ProductVariant::factory()->create()->id,
        'price' => 11000,
        'quantity' => 1,
    ]);
    $engagement->update(['order_item_id' => $orderItem->id]);
    $order->paymentReceipt()->create([
        'file_path' => 'receipts/receipt.png',
        'status' => 'pending',
    ]);

    $this->actingAs($this->admin)
        ->get("/admin/services/{$engagement->id}")
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->where('engagement.order.payment_receipt.status', 'pending')
            ->where('engagement.order.payment_receipt.file_path', 'receipts/receipt.png')
            ->etc()
        );
});

it('blocks non-admins from the services area', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get('/admin/services')->assertForbidden();
});
