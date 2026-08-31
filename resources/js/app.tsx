import { createInertiaApp } from '@inertiajs/react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { registerCsrfPriming } from '@/lib/csrf';
import { resolveLayout } from '@/lib/resolve-layout';
import './echo';

// Before createInertiaApp, so the interceptor is in place ahead of any request
// the app can make.
registerCsrfPriming();

createInertiaApp({
    layout: resolveLayout,
    strictMode: true,
    setup({ el, App, props }) {
        if (!el) {
            throw new Error('Inertia root element not found.');
        }

        const app = (
            <TooltipProvider delayDuration={0}>
                <App {...props} />
                <Toaster />
            </TooltipProvider>
        );

        // When SSR is active the server already delivered the markup, so it has
        // to be hydrated: calling createRoot on server-rendered HTML discards it
        // and re-renders from scratch, throwing away the whole point of SSR. An
        // empty root means SSR is off (or unreachable), so mount normally.
        if (el.hasChildNodes()) {
            hydrateRoot(el, app);

            return;
        }

        createRoot(el).render(app);
    },
    progress: {
        color: '#4B5563',
        // Inertia waits 250ms before showing the bar, which is sensible when the
        // server answers quickly. It does not here: a click has a full quarter
        // second where nothing acknowledges it, which reads as a dead tap.
        delay: 100,
    },
});

// This will set light / dark mode on load...
initializeTheme();
