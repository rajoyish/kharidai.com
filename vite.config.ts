import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    ssr: {
        // The admin editor (`novel`) reaches `react-tweet`, which imports a CSS
        // module. Left external, Node would try to `import` that .css at runtime
        // and die with ERR_UNKNOWN_FILE_EXTENSION, taking the SSR server with it.
        // Bundling it through Vite lets Vite handle the stylesheet instead.
        noExternal: ['novel', 'react-tweet'],
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],

            refresh: true,
            detectTls: false,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        // `app.tsx` supplies a manual `setup` callback, which opts out of the
        // plugin's automatic SSR handling, so the SSR entry is named explicitly.
        inertia({
            ssr: {
                entry: 'resources/js/ssr.tsx',
            },
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
});
