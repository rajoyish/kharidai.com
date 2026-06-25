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
import { router } from '@inertiajs/react';
import axios from 'axios';

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
import { Bell, Check, CircleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

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

    useEffect(() => {
        fetchNotifications();

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
                if (prev.some(n => n.id === formatted.id)) return prev;
                setUnreadCount(c => c + 1);
                return [formatted, ...prev].slice(0, 20);
            });
        };

        window.addEventListener('new-notification', handleNewNotification as EventListener);

        return () => {
            window.removeEventListener('new-notification', handleNewNotification as EventListener);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get('/notifications');
            setNotifications(res.data.notifications);
            setUnreadCount(res.data.unread_count);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markAsRead = async (notification: Notification) => {
        if (!notification.read_at) {
            try {
                await axios.post(`/notifications/${notification.id}/mark-read`);
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)),
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
            await axios.post('/notifications/mark-all-read');
            setNotifications([]);
            setUnreadCount(0);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-600">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
                <div className="flex items-center justify-between p-2">
                    <DropdownMenuLabel className="p-0 text-base font-semibold">Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground" onClick={markAllAsRead}>
                            <Check className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notification.read_at ? 'bg-muted/50' : ''}`}
                                onClick={() => markAsRead(notification)}
                            >
                                <div className="flex w-full items-center justify-between">
                                    <span className="font-medium text-sm">{notification.data.message}</span>
                                    {!notification.read_at && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                                </div>
                                <span className="text-xs text-muted-foreground line-clamp-2">
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
