import { router } from '@inertiajs/react';
import axios from 'axios';
import { Bell, Check } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
    index as notificationsIndex,
    markAllAsRead as markAllAsReadRoute,
    markAsRead as markAsReadRoute,
} from '@/actions/App/Http/Controllers/NotificationController';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

interface Notification {
    id: string;
    data: {
        message: string;
        description: string;
        url: string;
        order_id: string;
    };
    read_at: string | null;
    created_at: string;
}

export function NotificationsPanel() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await axios.get(notificationsIndex.url());
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unread_count);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchNotifications();

        // Re-sync when a bulk action elsewhere (e.g. the dedicated
        // notifications page) changes the notification set.
        const handleNotificationsChanged = () => {
            fetchNotifications();
        };

        window.addEventListener(
            'notifications-changed',
            handleNotificationsChanged,
        );

        const handleNewNotification = (e: CustomEvent) => {
            const newNotification = e.detail;
            // Structure it to match database format
            const formatted: Notification = {
                id: newNotification.id || Date.now().toString(),
                data: {
                    message: newNotification.message,
                    description: newNotification.description,
                    url: newNotification.url,
                    order_id: newNotification.order_id,
                },
                read_at: null,
                created_at: new Date().toISOString(),
            };

            setNotifications((prev) => {
                if (prev.some((n) => n.id === formatted.id)) {
                    return prev;
                }

                setUnreadCount((c) => c + 1);

                return [formatted, ...prev].slice(0, 20);
            });
        };

        window.addEventListener(
            'new-notification',
            handleNewNotification as EventListener,
        );

        return () => {
            window.removeEventListener(
                'new-notification',
                handleNewNotification as EventListener,
            );
            window.removeEventListener(
                'notifications-changed',
                handleNotificationsChanged,
            );
        };
    }, [fetchNotifications]);

    const markAsRead = async (notification: Notification) => {
        if (!notification.read_at) {
            try {
                await axios.post(markAsReadRoute.url(notification.id));
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id
                            ? { ...n, read_at: new Date().toISOString() }
                            : n,
                    ),
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            } catch (error) {
                console.error('Failed to mark notification as read', error);
            }
        }

        setIsOpen(false);
        router.visit(notification.data.url);
    };

    const markAllAsRead = async () => {
        try {
            await axios.post(markAllAsReadRoute.url());
            setNotifications((prev) =>
                prev.map((n) =>
                    n.read_at
                        ? n
                        : { ...n, read_at: new Date().toISOString() },
                ),
            );
            setUnreadCount(0);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                >
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-600">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
                <div className="flex items-center justify-between p-2">
                    <DropdownMenuLabel className="p-0 text-base font-semibold">
                        Notifications
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 text-xs text-muted-foreground"
                            onClick={markAllAsRead}
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className="max-h-75 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex cursor-pointer flex-col items-start gap-1 p-3 ${!notification.read_at ? 'bg-muted/50' : ''}`}
                                onClick={() => markAsRead(notification)}
                            >
                                <div className="flex w-full items-center justify-between">
                                    <span className="text-sm font-medium">
                                        {notification.data.message}
                                    </span>
                                    {!notification.read_at && (
                                        <span className="h-2 w-2 rounded-full bg-blue-600" />
                                    )}
                                </div>
                                <span className="line-clamp-2 text-xs text-muted-foreground">
                                    {notification.data.description}
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
