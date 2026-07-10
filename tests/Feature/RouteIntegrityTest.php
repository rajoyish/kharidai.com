<?php

use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\Route;

/**
 * Guards against routes that point at controller actions which do not exist.
 * Such a route registers fine and only fatals when someone requests it, so
 * nothing else in the suite would catch it.
 */
it('points every route at a callable controller action', function () {
    $broken = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $route): bool => is_string($route->getAction('controller')))
        ->reject(function (RoutingRoute $route): bool {
            [$class, $method] = array_pad(explode('@', $route->getAction('controller'), 2), 2, '__invoke');

            if (! class_exists($class) || ! method_exists($class, $method)) {
                return false;
            }

            return (new ReflectionMethod($class, $method))->isPublic();
        })
        ->map(fn (RoutingRoute $route): string => sprintf(
            '%s %s -> %s',
            implode('|', $route->methods()),
            $route->uri(),
            $route->getAction('controller'),
        ))
        ->values()
        ->all();

    expect($broken)->toBe([]);
});
