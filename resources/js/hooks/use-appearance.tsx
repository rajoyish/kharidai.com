import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'system';

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie.match(
        new RegExp(`(?:^|;\\s*)${name}=([^;]*)`),
    );

    return match ? decodeURIComponent(match[1]) : null;
};

const isAppearance = (value: string | null): value is Appearance =>
    value === 'light' || value === 'dark' || value === 'system';

/**
 * The stored preference, preferring localStorage but falling back to the cookie.
 *
 * The two can diverge: the cookie is what the server rendered the page from, and
 * a browser can drop localStorage on its own (storage pressure, privacy modes)
 * while keeping cookies. Reading localStorage alone meant a visitor in that
 * state was served a dark page and then had it flipped back to light a moment
 * later, with their preference quietly overwritten.
 */
const getStoredAppearance = (): Appearance => {
    if (typeof window === 'undefined') {
        return 'system';
    }

    const stored = localStorage.getItem('appearance');

    if (isAppearance(stored)) {
        return stored;
    }

    const cookie = getCookie('appearance');

    return isAppearance(cookie) ? cookie : 'system';
};

const isDarkMode = (appearance: Appearance): boolean => {
    return appearance === 'dark' || (appearance === 'system' && prefersDark());
};

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const isDark = isDarkMode(appearance);

    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
};

let transitionTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Cross-fade the theme swap instead of cutting to it.
 *
 * The transition is armed only for the length of the change: a standing
 * `transition: background-color` on every element would also smear ordinary
 * hover states, and would make the first paint fade in from whichever theme the
 * stylesheet happened to define first. `app.css` scopes the rule to this
 * attribute and honours `prefers-reduced-motion`.
 */
const withThemeTransition = (change: () => void): void => {
    if (typeof document === 'undefined') {
        change();

        return;
    }

    const root = document.documentElement;

    root.setAttribute('data-theme-switching', '');
    change();

    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
        root.removeAttribute('data-theme-switching');
    }, 200);
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => listeners.delete(callback);
};

const notify = (): void => listeners.forEach((listener) => listener());

const mediaQuery = (): MediaQueryList | null => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = (): void =>
    withThemeTransition(() => applyTheme(currentAppearance));

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    currentAppearance = getStoredAppearance();

    // Write both stores back, so whichever one was missing is refilled and the
    // next request is rendered from the same preference the client is holding.
    localStorage.setItem('appearance', currentAppearance);
    setCookie('appearance', currentAppearance);

    // Applied directly rather than through the transition: the first paint
    // should already be the right theme, not fade into it.
    applyTheme(currentAppearance);

    // Set up system theme change listener
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'system',
    );

    const resolvedAppearance: ResolvedAppearance = isDarkMode(appearance)
        ? 'dark'
        : 'light';

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        withThemeTransition(() => applyTheme(mode));
        notify();
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
