import axios from 'axios';
import { markAsRead as markAsReadRoute } from '@/actions/App/Http/Controllers/NotificationController';

// Ensure Laravel treats these background requests as AJAX (and lets axios attach
// the XSRF token) regardless of which notification surface fires first.
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

/**
 * Window event broadcast whenever the notification set changes (an item was
 * read, or a bulk action ran). The bell dropdown and the dedicated
 * notifications page each keep their own independent state, so they listen for
 * this to reconcile without a hard refresh.
 */
export const NOTIFICATIONS_CHANGED_EVENT = 'notifications-changed';

/** Which surface a change originated from, so a listener can ignore its own broadcasts. */
export type NotificationSource = 'bell' | 'page';

type NotificationsChangedDetail = { source: NotificationSource };

/**
 * Broadcast that the notification set changed so every other surface updates.
 */
export function notifyNotificationsChanged(source: NotificationSource): void {
    window.dispatchEvent(
        new CustomEvent<NotificationsChangedDetail>(
            NOTIFICATIONS_CHANGED_EVENT,
            { detail: { source } },
        ),
    );
}

/**
 * Subscribe to notification-change broadcasts from *other* surfaces. Events that
 * originate from `ownSource` are ignored so a surface never reacts to its own
 * update (which it has already applied locally). Returns an unsubscribe function.
 */
export function onNotificationsChanged(
    ownSource: NotificationSource,
    handler: () => void,
): () => void {
    const listener = (event: Event) => {
        const detail = (event as CustomEvent<NotificationsChangedDetail>)
            .detail;

        if (detail?.source === ownSource) {
            return;
        }

        handler();
    };

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);

    return () =>
        window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
}

/**
 * Persist a single notification's read state, then broadcast the change so the
 * other surface reconciles. Safe to call from the bell dropdown or the
 * dedicated notifications page.
 */
export async function markNotificationRead(
    id: string,
    source: NotificationSource,
): Promise<void> {
    await axios.post(markAsReadRoute.url(id));
    notifyNotificationsChanged(source);
}
