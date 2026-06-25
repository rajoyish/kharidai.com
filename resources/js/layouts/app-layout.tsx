import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { auth } = usePage<any>().props;

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && auth?.user?.is_admin) {
            try {
                const channel = window.Echo.join('support');
                return () => {
                    if (window.Echo) {
                        window.Echo.leave('support');
                    }
                };
            } catch (e) {
                console.warn('Global presence unavailable:', e);
            }
        }
    }, [auth?.user?.is_admin]);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
