import {
    NotificationsView
    
} from '@/components/notifications-view';
import type {PaginatedNotifications} from '@/components/notifications-view';
import { home } from '@/routes';
import {
    destroyAll,
    index as userNotificationsIndex,
    markAllRead,
} from '@/routes/user/notifications';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Home', href: home() },
    { title: 'Notifications', href: userNotificationsIndex() },
];

export default function UserNotificationsIndex({
    notifications,
    unread_count,
}: {
    notifications: PaginatedNotifications;
    unread_count: number;
}) {
    return (
        <NotificationsView
            notifications={notifications}
            unreadCount={unread_count}
            markAllReadForm={markAllRead.form()}
            destroyAllForm={destroyAll.form()}
        />
    );
}

UserNotificationsIndex.layout = {
    breadcrumbs: breadcrumbs,
};
