import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Mirrors the cases of `App\Enums\EngagementStatus`. */
export type EngagementStatusValue =
    | 'pending_contract'
    | 'awaiting_advance'
    | 'in_progress'
    | 'negotiation'
    | 'final_billing'
    | 'awaiting_payment'
    | 'completed'
    | 'cancelled';

/**
 * The lifecycle status is what tells a customer we are working on their
 * service, so each state gets its own colour rather than a uniform grey. This
 * is deliberately distinct from the payment status (Paid / Due), which answers
 * a different question and is shown alongside it.
 */
const STATUS_STYLES: Record<EngagementStatusValue, string> = {
    pending_contract:
        'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    awaiting_advance:
        'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100',
    in_progress:
        'bg-blue-100 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100',
    negotiation:
        'bg-purple-100 text-purple-900 dark:bg-purple-900/50 dark:text-purple-100',
    final_billing:
        'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100',
    awaiting_payment:
        'bg-teal-100 text-teal-900 dark:bg-teal-900/50 dark:text-teal-100',
    completed:
        'bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100',
    cancelled: 'bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100',
};

const FALLBACK_STYLE = 'bg-muted text-muted-foreground';

type EngagementStatusBadgeProps = {
    status: string;
    label: string;
    className?: string;
};

export function EngagementStatusBadge({
    status,
    label,
    className,
}: EngagementStatusBadgeProps) {
    const style =
        STATUS_STYLES[status as EngagementStatusValue] ?? FALLBACK_STYLE;

    return (
        <Badge className={cn('border-transparent', style, className)}>
            {label}
        </Badge>
    );
}
