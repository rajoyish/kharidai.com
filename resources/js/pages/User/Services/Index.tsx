import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

import { CopyableOrderNumber } from '@/components/copy-button';
import { EngagementStatusBadge } from '@/components/engagement-status-badge';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatNpr } from '@/lib/currency';
import { home } from '@/routes';
import { index as servicesIndex } from '@/routes/account/services';
import { show as showOrder } from '@/routes/orders';

type Engagement = {
    id: number;
    status: string;
    status_label: string;
    payment_status: string;
    project_name: string | null;
    total_npr: number;
    due_npr: number;
    project_completion_date: string | null;
    product: { id: number; title: string } | null;
    variant: { id: number; name: string } | null;
    order_id: number | null;
    order_number: string | null;
    delivery_note: string | null;
    created_at: string | null;
};

export default function UserServicesIndex({
    engagements,
}: {
    engagements: Engagement[];
}) {
    return (
        <>
            <SeoHead title="My Services" />

            <PagePanel title="My Services" variant="transparent">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Service</TableHead>
                            <TableHead>Package</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Completion Date</TableHead>
                            <TableHead className="text-right">
                                Total Amount
                            </TableHead>
                            <TableHead className="text-right">
                                Due Amount
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {engagements.map((engagement) => (
                            <TableRow key={engagement.id}>
                                <TableCell>
                                    <div className="font-medium">
                                        {engagement.project_name ??
                                            engagement.product?.title ??
                                            '—'}
                                    </div>
                                    {engagement.delivery_note && (
                                        <div className="text-xs text-muted-foreground">
                                            {engagement.delivery_note}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {engagement.variant?.name ?? '—'}
                                </TableCell>
                                <TableCell>
                                    {engagement.order_id &&
                                    engagement.order_number ? (
                                        <div className="flex flex-col items-start gap-1">
                                            <CopyableOrderNumber
                                                orderNumber={
                                                    engagement.order_number
                                                }
                                            >
                                                <Link
                                                    href={showOrder(
                                                        engagement.order_id,
                                                    )}
                                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                                >
                                                    {engagement.order_number}
                                                </Link>
                                            </CopyableOrderNumber>
                                            {engagement.payment_status ===
                                                'due' &&
                                                engagement.due_npr > 0 && (
                                                    <Link
                                                        href={showOrder(
                                                            engagement.order_id,
                                                        )}
                                                        className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        Pay now
                                                        <ArrowRight className="h-3 w-3" />
                                                    </Link>
                                                )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            Admin assigned
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <EngagementStatusBadge
                                        status={engagement.status}
                                        label={engagement.status_label}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            engagement.payment_status === 'paid'
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {engagement.payment_status === 'paid'
                                            ? 'Paid'
                                            : 'Due'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {engagement.project_completion_date ?? '—'}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatNpr(engagement.total_npr)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatNpr(engagement.due_npr)}
                                </TableCell>
                            </TableRow>
                        ))}
                        {engagements.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    You have no services yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

UserServicesIndex.layout = {
    breadcrumbs: [
        { title: 'Home', href: home() },
        { title: 'My Services', href: servicesIndex() },
    ],
};
