import { createInertiaApp } from '@inertiajs/react';
import type { ResolvedComponent } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';

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
 * Phusion Passenger assigns this process its port at boot and passes it in as
 * `PORT`. Binding to a hard-coded 13714 would mean listening on a port that
 * Passenger is not proxying, so the port is read from the environment, with
 * Inertia's default kept as the fallback for local runs.
 */
const port = Number(process.env.PORT) || 13714;

createServer(
    (page) =>
        createInertiaApp({
            page,
            render: ReactDOMServer.renderToString,
            resolve: (name) => pages[`./pages/${name}.tsx`],
            layout: resolveLayout,
            // The Toaster is deliberately absent: it renders nothing until a
            // toast fires, and toasts are client-only, so server-rendering it
            // would only invite a hydration mismatch.
            setup: ({ App, props }) => (
                <TooltipProvider delayDuration={0}>
                    <App {...props} />
                </TooltipProvider>
            ),
        }),
    port,
);
