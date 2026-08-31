import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * The three status vocabularies this app shows over and over: an order's
 * fulfilment state, an approval decision, and whether money has arrived.
 *
 * Each was previously written inline as a `bg-green-100 text-green-800` ternary
 * on every screen that needed it, which is why the same status could be a
 * different colour on two pages and why several of them had no dark form at all.
 * The colours now come from the semantic status tokens, which are solved for
 * 4.5:1 against their own surface in both themes.
 */

type BadgeVariant = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

const ORDER_STATUS: Record<string, BadgeVariant> = {
    completed: 'success',
    delivered: 'success',
    delivering: 'info',
    processing: 'info',
    shipped: 'info',
    pending: 'warning',
    cancelled: 'danger',
    refunded: 'danger',
    failed: 'danger',
};

const APPROVAL_STATUS: Record<string, BadgeVariant> = {
    approved: 'success',
    verified: 'success',
    rejected: 'danger',
    declined: 'danger',
    pending: 'warning',
};

/** Anything the maps do not name falls back to the warning tint, which is how
 *  these ternaries already treated their unmatched branch. */
const FALLBACK: BadgeVariant = 'warning';

function StatusPill({
    variant,
    label,
    className,
}: {
    variant: BadgeVariant;
    label: string;
    className?: string;
}) {
    return (
        <Badge
            variant={variant}
            className={cn('rounded-full capitalize', className)}
        >
            {label}
        </Badge>
    );
}

export function OrderStatusBadge({
    status,
    label,
    className,
}: {
    status: string;
    /** Overrides the visible text when the pill needs to name what it describes
     *  ("Shipment: delivered") while still colouring from `status`. */
    label?: string;
    className?: string;
}) {
    return (
        <StatusPill
            variant={ORDER_STATUS[status] ?? FALLBACK}
            label={label ?? status}
            className={className}
        />
    );
}

export function ApprovalStatusBadge({
    status,
    className,
}: {
    status: string;
    className?: string;
}) {
    return (
        <StatusPill
            variant={APPROVAL_STATUS[status] ?? FALLBACK}
            label={status}
            className={className}
        />
    );
}

export function PaymentStatusBadge({
    paid,
    paidLabel = 'Paid',
    dueLabel = 'Due',
    className,
}: {
    paid: boolean;
    paidLabel?: string;
    dueLabel?: string;
    className?: string;
}) {
    return (
        <StatusPill
            variant={paid ? 'success' : 'warning'}
            label={paid ? paidLabel : dueLabel}
            className={className}
        />
    );
}
