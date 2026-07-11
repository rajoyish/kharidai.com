import { Form, Link } from '@inertiajs/react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Timeline,
    TimelineContent,
    TimelineDescription,
    TimelineDot,
    TimelineHeader,
    TimelineIndicator,
    TimelineItem,
    TimelineTime,
    TimelineTitle,
} from '@/components/ui/timeline';
import { cn } from '@/lib/utils';
import type { RouteFormDefinition } from '@/wayfinder';

export type NotificationItem = {
    id: string;
    type: string;
    data: {
        message?: string;
        description?: string;
        url?: string;
        order_id?: string | number;
    };
    read_at: string | null;
    created_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type PaginatedNotifications = {
    data: NotificationItem[];
    links: PaginationLink[];
    total: number;
};

/**
 * Notify the bell dropdown (which keeps its own local state) that the
 * notification set changed so it can re-fetch its unread badge count.
 */
function syncNotificationBell(): void {
    window.dispatchEvent(new CustomEvent('notifications-changed'));
}

function formatTimestamp(value: string): string {
    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export function NotificationsView({
    notifications,
    unreadCount,
    markAllReadForm,
    destroyAllForm,
}: {
    notifications: PaginatedNotifications;
    unreadCount: number;
    markAllReadForm: RouteFormDefinition<'post'>;
    destroyAllForm: RouteFormDefinition<'post'>;
}) {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const hasNotifications = notifications.data.length > 0;

    return (
        <>
            <SeoHead title="Notifications" />

            <PagePanel
                title="Notifications"
                description={`${notifications.total} total · ${unreadCount} unread`}
                variant="transparent"
                actions={
                    <>
                        <Form
                            {...markAllReadForm}
                            options={{ preserveScroll: true }}
                            onSuccess={() => syncNotificationBell()}
                        >
                            {({ processing }) => (
                                <Button
                                    type="submit"
                                    variant="outline"
                                    size="sm"
                                    disabled={unreadCount === 0 || processing}
                                >
                                    <CheckCheck className="h-4 w-4" />
                                    Mark All as Read
                                </Button>
                            )}
                        </Form>

                        <AlertDialog
                            open={isDeleteOpen}
                            onOpenChange={setIsDeleteOpen}
                        >
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                    disabled={!hasNotifications}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete All
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Delete all notifications?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This permanently removes all of your
                                        notifications and cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Form
                                    {...destroyAllForm}
                                    options={{ preserveScroll: true }}
                                    onSuccess={() => {
                                        syncNotificationBell();
                                        setIsDeleteOpen(false);
                                    }}
                                >
                                    {({ processing }) => (
                                        <AlertDialogFooter>
                                            <AlertDialogCancel type="button">
                                                Cancel
                                            </AlertDialogCancel>
                                            <Button
                                                type="submit"
                                                variant="destructive"
                                                disabled={processing}
                                            >
                                                {processing
                                                    ? 'Deleting…'
                                                    : 'Delete All'}
                                            </Button>
                                        </AlertDialogFooter>
                                    )}
                                </Form>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                }
            >
                <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
                    {hasNotifications ? (
                        <Timeline>
                            {notifications.data.map((notification) => {
                                const isUnread = !notification.read_at;

                                return (
                                    <TimelineItem key={notification.id}>
                                        <TimelineIndicator>
                                            <TimelineDot
                                                className={cn(
                                                    isUnread
                                                        ? 'border-primary/40 bg-primary/10 text-primary'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                <Bell />
                                            </TimelineDot>
                                        </TimelineIndicator>

                                        <TimelineContent
                                            className={cn(
                                                !isUnread && 'opacity-70',
                                            )}
                                        >
                                            <TimelineHeader>
                                                <TimelineTitle
                                                    className={cn(
                                                        isUnread &&
                                                            'font-semibold',
                                                    )}
                                                >
                                                    {notification.data.message ??
                                                        'Notification'}
                                                    {isUnread && (
                                                        <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 align-middle text-[10px] font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                            New
                                                        </span>
                                                    )}
                                                </TimelineTitle>
                                                <TimelineTime
                                                    dateTime={
                                                        notification.created_at
                                                    }
                                                >
                                                    {formatTimestamp(
                                                        notification.created_at,
                                                    )}
                                                </TimelineTime>
                                            </TimelineHeader>

                                            {notification.data.description && (
                                                <TimelineDescription>
                                                    {
                                                        notification.data
                                                            .description
                                                    }
                                                </TimelineDescription>
                                            )}

                                            {notification.data.url && (
                                                <Button
                                                    variant="link"
                                                    size="sm"
                                                    asChild
                                                    className="mt-1 h-auto p-0 text-xs"
                                                >
                                                    <Link
                                                        href={
                                                            notification.data.url
                                                        }
                                                    >
                                                        View details
                                                    </Link>
                                                </Button>
                                            )}
                                        </TimelineContent>
                                    </TimelineItem>
                                );
                            })}
                        </Timeline>
                    ) : (
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <Bell className="h-6 w-6" />
                            <p className="text-sm">No notifications yet.</p>
                        </div>
                    )}

                    {notifications.links.length > 3 && (
                        <div className="mt-6 flex items-center justify-center border-t pt-4">
                            <nav className="flex items-center gap-1">
                                {notifications.links.map((link, i) =>
                                    link.url ? (
                                        <Link
                                            key={i}
                                            href={link.url}
                                            preserveScroll
                                            className={cn(
                                                'rounded-md px-3 py-1 text-sm',
                                                link.active
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-muted',
                                            )}
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ) : (
                                        <span
                                            key={i}
                                            className="px-3 py-1 text-sm text-muted-foreground opacity-50"
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ),
                                )}
                            </nav>
                        </div>
                    )}
                </div>
            </PagePanel>
        </>
    );
}
