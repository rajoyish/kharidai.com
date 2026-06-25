import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';
import { usePage, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { auth } = usePage<any>().props;

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && auth?.user) {
            // Global admin support presence
            if (auth.user.is_admin) {
                try {
                    window.Echo.join('support');
                } catch (e) {
                    console.warn('Global presence unavailable:', e);
                }
            }

            // Global user notification listener
            try {
                const privateChannel = window.Echo.private(`App.Models.User.${auth.user.id}`);
                privateChannel.notification((notification: any) => {
                    // Prevent redundant message notifications if we are already on the order chat page
                    if (
                        notification.type === 'App\\Notifications\\NewMessageNotification' &&
                        window.location.pathname.includes(`/orders/${notification.order_id}`)
                    ) {
                        return;
                    }

                    toast.info(notification.message, {
                        description: notification.description,
                        action: {
                            label: 'View',
                            onClick: () => router.visit(notification.url),
                        },
                        duration: 5000,
                    });

                    // Dispatch custom event for NotificationsPanel
                    window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
                });
            } catch (e) {
                console.warn('Global notification listener unavailable:', e);
            }

            return () => {
                if (window.Echo) {
                    if (auth.user.is_admin) window.Echo.leave('support');
                    window.Echo.leave(`App.Models.User.${auth.user.id}`);
                }
            };
        }
    }, [auth?.user?.id, auth?.user?.is_admin]);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </AppLayoutTemplate>
    );
}
