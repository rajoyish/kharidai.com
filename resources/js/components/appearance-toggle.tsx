import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

/**
 * Subscribe to the `dark` class on `<html>`, which is what the stylesheet
 * actually renders from. Watching the class rather than the stored preference
 * means the switch still reports the truth when the theme changes from
 * somewhere else: the settings page, or the OS while "system" is selected.
 */
const subscribeToTheme = (onChange: () => void): (() => void) => {
    const observer = new MutationObserver(onChange);

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
    });

    return () => observer.disconnect();
};

const isDocumentDark = (): boolean =>
    document.documentElement.classList.contains('dark');

/**
 * The server cannot know a visitor's system colour scheme, so it always renders
 * the switch off. React uses this same value for the hydrating render and only
 * then swaps to the live one, which is what keeps hydration from mismatching.
 */
const isDocumentDarkOnServer = (): boolean => false;

/**
 * The theme control for the site chrome: one click, no menu.
 *
 * Two things make this harder than it looks, and both are handled by driving
 * the *visuals* from the `dark` class on `<html>` rather than from React state:
 *
 * 1. The server cannot know a visitor's system colour scheme, so any state we
 *    render from JavaScript disagrees with the SSR markup on the first paint
 *    and React discards the server render (see `resolveLayout` and `ssr.tsx`).
 *    The class is already correct before hydration because the inline script in
 *    `app.blade.php` sets it, so CSS reaches the right answer with no JS at all.
 * 2. Reading state during render would make the thumb jump into place after
 *    hydration. Driven by CSS it is simply drawn in the right position.
 *
 * `aria-checked` is the one thing CSS cannot express, so it comes from
 * `useSyncExternalStore`, which exists for exactly this split: the server
 * snapshot is used for SSR and hydration, the live one for every render after.
 *
 * The three-way choice (including "system") stays available on the appearance
 * settings page; this control is the fast path between light and dark.
 */
export function AppearanceToggle({ className }: { className?: string }) {
    const { updateAppearance } = useAppearance();
    const isDark = useSyncExternalStore(
        subscribeToTheme,
        isDocumentDark,
        isDocumentDarkOnServer,
    );

    const toggle = (): void => {
        // Resolved from the document rather than the stored preference, so a
        // visitor on "system" gets the opposite of what they can actually see.
        updateAppearance(isDocumentDark() ? 'light' : 'dark');
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Dark theme"
            onClick={toggle}
            className={cn(
                'group relative inline-flex h-8 w-[3.375rem] shrink-0 cursor-pointer items-center rounded-full',
                'border border-border-strong bg-muted p-1',
                'transition-colors duration-200 ease-out',
                'hover:border-primary/50 hover:bg-secondary',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
        >
            {/* The sliding thumb. `translate` is the only animated property, so
                the whole control stays on the compositor and the header never
                reflows as the theme changes. */}
            <span
                aria-hidden
                className={cn(
                    'pointer-events-none relative z-10 flex size-6 items-center justify-center rounded-full',
                    'bg-card text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10',
                    'transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    'translate-x-0 dark:translate-x-[1.375rem]',
                    'group-active:scale-90',
                )}
            >
                <Sun
                    className={cn(
                        'absolute size-3.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                        'scale-100 rotate-0 opacity-100',
                        'dark:scale-50 dark:-rotate-90 dark:opacity-0',
                    )}
                />
                <Moon
                    className={cn(
                        'absolute size-3.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
                        'scale-50 rotate-90 opacity-0',
                        'dark:scale-100 dark:rotate-0 dark:opacity-100',
                    )}
                />
            </span>

            {/* The destination the thumb is not currently sitting on, so the
                control says what a click will do rather than only where it is. */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 flex w-6 items-center justify-center text-muted-foreground opacity-100 transition-opacity duration-200 dark:opacity-0"
            >
                <Moon className="size-3" />
            </span>
            <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 flex w-6 items-center justify-center text-muted-foreground opacity-0 transition-opacity duration-200 dark:opacity-100"
            >
                <Sun className="size-3" />
            </span>
        </button>
    );
}
