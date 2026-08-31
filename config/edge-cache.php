<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Edge Caching
    |--------------------------------------------------------------------------
    |
    | Marks guest storefront pages cacheable by the CDN so an anonymous visitor
    | is answered from the edge instead of crossing the network to the origin.
    |
    | Off by default, and it must stay off until a matching CDN rule exists.
    | Sending `s-maxage` to a CDN that has not been told to bypass the cache for
    | requests carrying a session cookie is how one shopper ends up looking at
    | another shopper's page. The rule to add is documented in the
    | `ssr-shared-hosting` skill.
    |
    */

    'enabled' => env('EDGE_CACHE_GUEST_PAGES', false),

    /*
    | How long the CDN may serve a stored copy, in seconds. Product and category
    | pages change when an admin edits them, and nothing purges the edge on save,
    | so this doubles as the worst-case delay before an edit is visible to a
    | logged-out visitor. Five minutes keeps that tolerable.
    */

    'ttl' => (int) env('EDGE_CACHE_TTL', 300),

];
