import { createInertiaApp } from '@inertiajs/react';
import type { ResolvedComponent } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';

import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resolveLayout } from '@/lib/resolve-layout';

/**
 * Every page is bundled eagerly: the SSR bundle is loaded once into a
 * long-lived Node process, so lazy chunks would buy nothing and only add an
 * async hop to each render.
 */
const pages = import.meta.glob<{ default: ResolvedComponent }>(
    './pages/**/*.tsx',
    { eager: true },
);

/**
 * Laravel reaches this process over loopback, so it binds to 127.0.0.1 rather
 * than Inertia's `0.0.0.0` default: on shared hosting a wildcard bind would put
 * the render endpoint on a public interface. Both values stay overridable so
 * the server can be moved off the default port without a rebuild.
 */
const port = Number(process.env.PORT) || 13714;
const host = process.env.SSR_HOST || '127.0.0.1';

createServer(
    (page) =>
        createInertiaApp({
            page,
            render: ReactDOMServer.renderToString,
            resolve: (name) => pages[`./pages/${name}.tsx`],
            layout: resolveLayout,
            // The Toaster renders an empty landmark `<section>` even with zero
            // toasts, so it has to be in the server tree as well: leaving it out
            // makes the client's first render one node longer than the markup it
            // hydrates, which is a mismatch. Keep this tree in step with app.tsx.
            setup: ({ App, props }) => (
                <TooltipProvider delayDuration={0}>
                    <App {...props} />
                    <Toaster />
                </TooltipProvider>
            ),
        }),
    { port, host },
);
