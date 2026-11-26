import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

/**
 * Which persistent layout wraps each page. Shared by the browser entry
 * (`app.tsx`) and the SSR entry (`ssr.tsx`) so the server-rendered markup and
 * the hydrated markup can never disagree about the page's layout — a mismatch
 * there throws away the server render.
 */
export function resolveLayout(name: string) {
    switch (true) {
        // Storefront pages bring their own layout; the error page stands alone,
        // since the app's layouts need data an error response may lack.
        case name === 'welcome':
        case name === 'Categories/Show':
        case name === 'Products/Show':
        case name === 'ErrorPage':
            return null;
        case name.startsWith('auth/'):
            return AuthLayout;
        case name.startsWith('settings/'):
            return [AppLayout, SettingsLayout];
        default:
            return AppLayout;
    }
}
