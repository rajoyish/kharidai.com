import { usePage, router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { MobileNumberPrompt } from '@/components/mobile-number-prompt';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { auth } = usePage<any>().props;

    // Depend on primitives, not the `auth.user` object: Inertia delivers a
    // fresh props object on every navigation, so keying the effect off the
    // object identity would tear down and rejoin the Echo channels (dropping
    // notifications in the gap) on every page visit.
    const userId = auth?.user?.id;
    const isAdmin = auth?.user?.is_admin;

    useEffect(() => {
        if (typeof window !== 'undefined' && window.Echo && userId) {
            // Global admin support presence
            if (isAdmin) {
                try {
                    window.Echo.join('support');
                } catch (e) {
                    console.warn('Global presence unavailable:', e);
                }
            }

            // Global user notification listener
            try {
                const privateChannel = window.Echo.private(
                    `App.Models.User.${userId}`,
                );
                privateChannel.notification((notification: any) => {
                    // Prevent redundant message notifications if we are already on the order chat page
                    if (
                        notification.type ===
                            'App\\Notifications\\NewMessageNotification' &&
                        window.location.pathname.includes(
                            `/orders/${notification.order_id}`,
                        )
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
                    window.dispatchEvent(
                        new CustomEvent('new-notification', {
                            detail: notification,
                        }),
                    );
                });
            } catch (e) {
                console.warn('Global notification listener unavailable:', e);
            }

            return () => {
                if (window.Echo) {
                    if (isAdmin) {
                        window.Echo.leave('support');
                    }

                    window.Echo.leave(`App.Models.User.${userId}`);
                }
            };
        }
    }, [userId, isAdmin]);

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs}>
            <MobileNumberPrompt />
            {children}
        </AppLayoutTemplate>
    );
}
