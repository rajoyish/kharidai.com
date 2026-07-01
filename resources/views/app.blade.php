<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @php($siteName = config('app.name', 'Laravel'))
        @php($seo = array_replace([
            'name' => $siteName,
            'title' => $siteName,
            'description' => 'Shop digital goods, subscriptions, services, and physical products from Kharidai.',
            'image' => asset('kharidai_og.png'),
            'imageAlt' => $siteName.' marketplace preview',
            'imageType' => 'image/png',
            'imageWidth' => 1200,
            'imageHeight' => 630,
            'url' => request()->url(),
            'type' => 'website',
            'robots' => 'noindex,nofollow',
            'twitterCard' => 'summary_large_image',
            'updatedTime' => null,
        ], data_get($page, 'props.seo', [])))
        <x-inertia::head>
            <title>{{ $seo['title'] }}</title>
            <meta data-inertia="description" name="description" content="{{ $seo['description'] }}" />
            <meta data-inertia="robots" name="robots" content="{{ $seo['robots'] }}" />
            <link data-inertia="canonical" rel="canonical" href="{{ $seo['url'] }}" />
            <link data-inertia="image_src" rel="image_src" href="{{ $seo['image'] }}" />

            <meta data-inertia="og:type" property="og:type" content="{{ $seo['type'] }}" />
            <meta data-inertia="og:site_name" property="og:site_name" content="{{ $seo['name'] }}" />
            <meta data-inertia="og:title" property="og:title" content="{{ $seo['title'] }}" />
            <meta data-inertia="og:description" property="og:description" content="{{ $seo['description'] }}" />
            <meta data-inertia="og:image" property="og:image" content="{{ $seo['image'] }}" />
            @if(str_starts_with($seo['image'], 'https://'))
            <meta data-inertia="og:image:secure_url" property="og:image:secure_url" content="{{ $seo['image'] }}" />
            @endif
            @if(filled($seo['imageType']))
            <meta data-inertia="og:image:type" property="og:image:type" content="{{ $seo['imageType'] }}" />
            @endif
            @if(filled($seo['imageWidth']))
            <meta data-inertia="og:image:width" property="og:image:width" content="{{ $seo['imageWidth'] }}" />
            @endif
            @if(filled($seo['imageHeight']))
            <meta data-inertia="og:image:height" property="og:image:height" content="{{ $seo['imageHeight'] }}" />
            @endif
            <meta data-inertia="og:image:alt" property="og:image:alt" content="{{ $seo['imageAlt'] }}" />
            <meta data-inertia="og:url" property="og:url" content="{{ $seo['url'] }}" />
            @if(filled($seo['updatedTime']))
            <meta data-inertia="og:updated_time" property="og:updated_time" content="{{ $seo['updatedTime'] }}" />
            @endif

            <meta data-inertia="twitter:card" name="twitter:card" content="{{ $seo['twitterCard'] }}" />
            <meta data-inertia="twitter:title" name="twitter:title" content="{{ $seo['title'] }}" />
            <meta data-inertia="twitter:description" name="twitter:description" content="{{ $seo['description'] }}" />
            <meta data-inertia="twitter:image" name="twitter:image" content="{{ $seo['image'] }}" />
            <meta data-inertia="twitter:image:alt" name="twitter:image:alt" content="{{ $seo['imageAlt'] }}" />
            <meta data-inertia="twitter:url" name="twitter:url" content="{{ $seo['url'] }}" />
        </x-inertia::head>

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-title" content="Kharidai" />
        <link rel="manifest" href="/site.webmanifest" />

        <script>
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js');
                });
            }
        </script>

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&family=TikTok+Sans:opsz,wght@12..36,300..900&display=swap" rel="stylesheet">

        @fonts

        @php($echoConfig = config('broadcasting.connections.pusher.frontend'))

        @if(filled($echoConfig['key'] ?? null))
        <script>
            window.EchoConfig = @js($echoConfig);
        </script>
        @endif

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
