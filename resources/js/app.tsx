import { createInertiaApp } from '@inertiajs/react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { resolveLayout } from '@/lib/resolve-layout';
import './echo';

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
    },
});

// This will set light / dark mode on load...
initializeTheme();
