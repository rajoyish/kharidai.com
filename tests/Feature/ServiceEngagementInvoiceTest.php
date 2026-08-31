<?php

use App\Enums\PricingStrategy;
use App\Models\ServiceEngagement;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->admin = User::factory()->create(['is_admin' => true]);
});

function bookLayoutEngagement(): ServiceEngagement
{
    return ServiceEngagement::factory()->inProgress()->create([
        'pricing_strategy' => PricingStrategy::PerPage,
        'pricing_config' => ['cover_rate_npr' => 500, 'inner_rate_npr' => 200],
    ]);
}

it('builds an invoice from line items, tax and advance', function () {
    $engagement = bookLayoutEngagement();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/invoice", [
            'project_name' => 'Good Management',
            'line_items' => [
                ['label' => 'Cover Pages', 'quantity' => 4, 'unit_price_npr' => 500],
                ['label' => 'Inner Pages', 'quantity' => 150, 'unit_price_npr' => 200],
            ],
            'tax_rate' => 13,
            'advance_paid_npr' => 10000,
            'project_completion_date' => '2026-07-08',
        ])
        ->assertRedirect();

    $engagement->refresh();

    // Subtotal 32,000 (2,000 cover + 30,000 inner), 13% tax = 4,160, grand 36,160.
    expect($engagement->project_name)->toBe('Good Management')
        ->and($engagement->subtotalNpr())->toBe(32000.0)
        ->and($engagement->taxNpr())->toBe(4160.0)
        ->and($engagement->grandTotalNpr())->toBe(36160.0)
        ->and($engagement->calculated_cost_npr)->toBe(32000.0)
        ->and($engagement->agreed_price_npr)->toBe(36160.0)
        ->and($engagement->advance_paid_npr)->toBe(10000.0)
        ->and($engagement->outstandingNpr())->toBe(26160.0)
        ->and($engagement->paymentStatus())->toBe('due')
        ->and($engagement->line_items)->toHaveCount(2)
        ->and($engagement->project_completion_date->format('Y-m-d'))->toBe('2026-07-08');
});

it('marks the invoice paid once the advance covers the grand total', function () {
    $engagement = bookLayoutEngagement();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/invoice", [
            'line_items' => [
                ['label' => 'Cover Pages', 'quantity' => 4, 'unit_price_npr' => 500],
                ['label' => 'Inner Pages', 'quantity' => 150, 'unit_price_npr' => 200],
            ],
            'tax_rate' => 13,
            'advance_paid_npr' => 36160,
        ])
        ->assertRedirect();

    $engagement->refresh();

    expect($engagement->outstandingNpr())->toBe(0.0)
        ->and($engagement->paymentStatus())->toBe('paid');
});

it('drops blank line item rows', function () {
    $engagement = bookLayoutEngagement();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/invoice", [
            'line_items' => [
                ['label' => 'Cover Pages', 'quantity' => 4, 'unit_price_npr' => 500],
                ['label' => '', 'quantity' => 0, 'unit_price_npr' => 0],
            ],
            'tax_rate' => 0,
        ])
        ->assertRedirect();

    expect($engagement->refresh()->line_items)->toHaveCount(1);
});

it('exposes operational columns on the services index', function () {
    $engagement = bookLayoutEngagement();
    $engagement->update([
        'project_name' => 'Good Management',
        'agreed_price_npr' => 36160,
        'advance_paid_npr' => 10000,
    ]);

    $this->actingAs($this->admin)
        ->get('/admin/services')
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Services/Index')
            ->where('engagements.0.project_name', 'Good Management')
            ->where('engagements.0.payment_status', 'due')
            ->where('engagements.0.total_npr', 36160)
            ->where('engagements.0.due_npr', 26160)
        );
});

it('overrides the payment status when the admin marks it paid', function () {
    $engagement = bookLayoutEngagement();
    $engagement->update(['agreed_price_npr' => 36160, 'advance_paid_npr' => 0]);

    // Derived status is "due" because a balance is outstanding.
    expect($engagement->paymentStatus())->toBe('due');

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/payment-status", ['is_paid' => true])
        ->assertRedirect();

    expect($engagement->refresh()->paymentStatus())->toBe('paid');
});

it('overrides the payment status when the admin marks it due', function () {
    $engagement = bookLayoutEngagement();
    // Advance covers the total, so the derived status would be "paid".
    $engagement->update(['agreed_price_npr' => 36160, 'advance_paid_npr' => 36160]);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/payment-status", ['is_paid' => false])
        ->assertRedirect();

    expect($engagement->refresh()->paymentStatus())->toBe('due');
});

it('records the invoice paid date once the invoice is settled', function () {
    $engagement = bookLayoutEngagement();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/invoice", [
            'line_items' => [
                ['label' => 'Cover Pages', 'quantity' => 4, 'unit_price_npr' => 500],
            ],
            'tax_rate' => 0,
            // The advance clears the 2,000 grand total, so the invoice reads as paid.
            'advance_paid_npr' => 2000,
            'invoice_paid_at' => '2026-08-20',
        ])
        ->assertRedirect();

    $engagement->refresh();

    expect($engagement->paymentStatus())->toBe('paid')
        ->and($engagement->invoice_paid_at->format('Y-m-d'))->toBe('2026-08-20');
});

it('refuses an invoice paid date while the invoice is still due', function () {
    $engagement = bookLayoutEngagement();

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/invoice", [
            'line_items' => [
                ['label' => 'Cover Pages', 'quantity' => 4, 'unit_price_npr' => 500],
            ],
            'tax_rate' => 0,
            'advance_paid_npr' => 0,
            'invoice_paid_at' => '2026-08-20',
        ])
        ->assertRedirect();

    $engagement->refresh();

    expect($engagement->paymentStatus())->toBe('due')
        ->and($engagement->invoice_paid_at)->toBeNull();
});

it('clears the invoice paid date when the admin reverts the status to due', function () {
    $engagement = bookLayoutEngagement();
    $engagement->update([
        'agreed_price_npr' => 36160,
        'advance_paid_npr' => 36160,
        'invoice_paid_at' => '2026-08-20',
    ]);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/payment-status", ['is_paid' => false])
        ->assertRedirect();

    $engagement->refresh();

    expect($engagement->paymentStatus())->toBe('due')
        ->and($engagement->invoice_paid_at)->toBeNull();
});

it('keeps the invoice paid date when the admin marks the invoice paid', function () {
    $engagement = bookLayoutEngagement();
    $engagement->update(['agreed_price_npr' => 36160, 'invoice_paid_at' => '2026-08-20']);

    $this->actingAs($this->admin)
        ->patch("/admin/services/{$engagement->id}/payment-status", ['is_paid' => true])
        ->assertRedirect();

    expect($engagement->refresh()->invoice_paid_at->format('Y-m-d'))->toBe('2026-08-20');
});

it('exposes the invoice paid date on the services index and detail pages', function () {
    $engagement = bookLayoutEngagement();

    // Nothing settled yet, so the column has no date to render.
    $this->actingAs($this->admin)
        ->get('/admin/services')
        ->assertInertia(fn (Assert $page) => $page
            ->where('engagements.0.invoice_paid_at', null)
        );

    $engagement->update(['invoice_paid_at' => '2026-08-20']);

    $this->actingAs($this->admin)
        ->get('/admin/services')
        ->assertInertia(fn (Assert $page) => $page
            ->where('engagements.0.invoice_paid_at', '8/20/2026')
        );

    $this->actingAs($this->admin)
        ->get("/admin/services/{$engagement->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->where('engagement.invoice_paid_at', '2026-08-20')
        );
});

it('deletes a service engagement', function () {
    $engagement = bookLayoutEngagement();

    $this->actingAs($this->admin)
        ->delete("/admin/services/{$engagement->id}")
        ->assertRedirect();

    expect(ServiceEngagement::query()->whereKey($engagement->id)->exists())->toBeFalse();
});

it('shows the invoice generator with strategy-derived line item suggestions', function () {
    $engagement = bookLayoutEngagement();

    $this->actingAs($this->admin)
        ->get("/admin/services/{$engagement->id}")
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Services/Show')
            ->where('lineItemSuggestions.0.label', 'Cover Pages')
            ->where('lineItemSuggestions.1.label', 'Inner Pages')
        );
});
