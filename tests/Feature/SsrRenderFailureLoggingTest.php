<?php

use App\Listeners\LogSsrRenderFailure;
use Illuminate\Support\Facades\Log;
use Inertia\Ssr\SsrErrorType;
use Inertia\Ssr\SsrRenderFailed;

it('logs a failed SSR render so the silent fallback is visible', function () {
    Log::shouldReceive('warning')
        ->once()
        ->withArgs(fn (string $message, array $context): bool => str_contains($message, 'SSR render failed')
            && $context['component'] === 'Cart/Index'
            && $context['error'] === 'Connection refused');

    (new LogSsrRenderFailure)->handle(new SsrRenderFailed(
        page: ['component' => 'Cart/Index', 'url' => '/cart'],
        error: 'Connection refused',
        type: SsrErrorType::Connection,
    ));
});

it('reports the same failure once per throttle window', function () {
    Log::shouldReceive('warning')->once();

    $event = new SsrRenderFailed(
        page: ['component' => 'welcome', 'url' => '/'],
        error: 'Connection refused',
        type: SsrErrorType::Connection,
    );

    $listener = new LogSsrRenderFailure;
    $listener->handle($event);
    $listener->handle($event);
    $listener->handle($event);
});

it('is registered for the Inertia SSR failure event', function () {
    $listeners = array_map(
        fn ($listener): string => is_string($listener) ? $listener : get_class($listener),
        app('events')->getRawListeners()[SsrRenderFailed::class] ?? [],
    );

    expect($listeners)->toContain(LogSsrRenderFailure::class);
});
