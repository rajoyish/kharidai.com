import { createInertiaApp } from '@inertiajs/react';
import ReactDOMServer from 'react-dom/server';
import { TooltipProvider } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Kharidai';

export default function render(page: any) {
    return createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        layout: (name) => {
            switch (true) {
                case name === 'welcome':
                case name === 'Products/Show':
                    return null;
                case name.startsWith('auth/'):
                    return AuthLayout;
                case name.startsWith('settings/'):
                    return [AppLayout, SettingsLayout];
                default:
                    return AppLayout;
            }
        },
        withApp(app) {
            return <TooltipProvider delayDuration={0}>{app}</TooltipProvider>;
        },
    });
}
