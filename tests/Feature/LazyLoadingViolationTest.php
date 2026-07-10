<?php

use App\Models\Order;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\LazyLoadingViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('prevents lazy loading', function () {
    expect(Model::preventsLazyLoading())->toBeTrue();
});

it('throws when a relation is lazy loaded outside production', function () {
    Order::factory()->count(2)->create(['user_id' => $this->user->id]);

    // Eloquent only arms the guard when a query hydrates more than one model,
    // since a single row cannot be the source of an N+1.
    $orders = Order::query()->limit(2)->get();

    expect(fn () => $orders->first()->items)
        ->toThrow(LazyLoadingViolationException::class);
});

it('logs rather than throws when a relation is lazy loaded in production', function () {
    Order::factory()->count(2)->create(['user_id' => $this->user->id]);
    $orders = Order::query()->limit(2)->get();

    Log::spy();
    $this->app->detectEnvironment(fn (): string => 'production');

    $items = $orders->first()->items;

    expect($items)->not->toBeNull();

    Log::shouldHaveReceived('warning')
        ->once()
        ->withArgs(fn (string $message): bool => str_contains($message, 'Attempted to lazy load [items]')
            && str_contains($message, Order::class));
});

it('exempts recently created models from the violation handler', function () {
    $order = Order::factory()->create(['user_id' => $this->user->id]);

    // A model that was just created cannot have caused an N+1, and Laravel's
    // default handler skips it. A custom handler replaces that default outright,
    // so it has to restate the exemption itself.
    $order->preventsLazyLoading = true;

    expect(fn () => $order->items)->not->toThrow(LazyLoadingViolationException::class);
});
