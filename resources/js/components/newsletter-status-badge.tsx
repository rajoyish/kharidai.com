import { Badge } from '@/components/ui/badge';

const NEWSLETTER_STATUS_VARIANTS: Record<
    string,
    'success' | 'warning' | 'info' | 'danger' | 'neutral'
> = {
    draft: 'neutral',
    queued: 'info',
    sending: 'info',
    paused: 'warning',
    sent: 'success',
};

/**
 * A newsletter's delivery state. "Paused" is warning rather than danger on
 * purpose: the queue released its jobs and will resume once the daily send
 * quota rolls over, so nothing has been lost.
 */
export function NewsletterStatusBadge({
    status,
    label,
}: {
    status: string;
    label: string;
}) {
    return (
        <Badge
            variant={NEWSLETTER_STATUS_VARIANTS[status] ?? 'neutral'}
            className="rounded-full"
        >
            {label}
        </Badge>
    );
}
