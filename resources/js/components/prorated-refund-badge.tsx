import { Undo2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { formatNpr } from '@/lib/currency';
import { cn } from '@/lib/utils';

/**
 * The refund columns every serialized order carries. `refund_amount` is null
 * until an admin records a prorated refund against the order.
 */
export type OrderRefund = {
    refund_amount: number | string | null;
    refunded_on: string | null;
    refund_receipt_path?: string | null;
    refund_note?: string | null;
};

export function hasProratedRefund(order: OrderRefund): boolean {
    return order.refund_amount !== null && order.refund_amount !== undefined;
}

/** Shows that part of an order's payment was handed back, and how much. */
export function ProratedRefundBadge({
    order,
    showAmount = false,
    className,
}: {
    order: OrderRefund;
    showAmount?: boolean;
    className?: string;
}) {
    if (!hasProratedRefund(order)) {
        return null;
    }

    return (
        <Badge
            variant="danger"
            className={cn('rounded-full', className)}
            title={
                order.refunded_on
                    ? `Prorated refund of ${formatNpr(order.refund_amount ?? 0)} on ${order.refunded_on}`
                    : undefined
            }
        >
            <Undo2 />
            {showAmount
                ? `Refunded ${formatNpr(order.refund_amount ?? 0)}`
                : 'Prorated refund'}
        </Badge>
    );
}

/**
 * A subscription's end date, or — once its order was refunded — the refund
 * date it actually ended on, with the original date struck through.
 */
export function SubscriptionEndDate({
    endDate,
    order,
}: {
    endDate: string | null;
    order: OrderRefund;
}) {
    if (!hasProratedRefund(order) || !order.refunded_on) {
        return <>{endDate || 'Lifetime'}</>;
    }

    return (
        <span className="flex flex-col">
            <span>{order.refunded_on}</span>
            <span className="text-xs text-muted-foreground line-through">
                {endDate || 'Lifetime'}
            </span>
        </span>
    );
}
