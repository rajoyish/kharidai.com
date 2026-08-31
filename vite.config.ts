import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig({
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    ssr: {
        // Bundle every dependency into `bootstrap/ssr/ssr.js`. Nothing is ever
        // built or installed on the shared host and the deploy does not ship
        // `node_modules`, so an externalised import is a package Node cannot
        // resolve at runtime: the process exits with ERR_MODULE_NOT_FOUND,
        // Inertia catches the connection failure and every page silently falls
        // back to client-side rendering. Vite externalises anything listed in
        // `dependencies` by default, so leaving this off means each new frontend
        // package is one more chance to break SSR without a failing build.
        //
        // It also settles the `novel` -> `react-tweet` case: that package
        // imports a CSS module, which Node would refuse to `import` with
        // ERR_UNKNOWN_FILE_EXTENSION. Bundled, Vite handles the stylesheet.
        noExternal: true,
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],

            refresh: true,
            detectTls: false,
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
