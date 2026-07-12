import { NotificationsView } from '@/components/notifications-view';
import type { PaginatedNotifications } from '@/components/notifications-view';
import { dashboard } from '@/routes/admin';
import {
    destroyAll,
    index as adminNotificationsIndex,
    markAllRead,
} from '@/routes/admin/notifications';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin Dashboard', href: dashboard().url },
    { title: 'Notifications', href: adminNotificationsIndex().url },
];

export default function AdminNotificationsIndex({
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

AdminNotificationsIndex.layout = {
    breadcrumbs: breadcrumbs,
};
