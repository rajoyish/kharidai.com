import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

import { show as showOrder } from '@/actions/App/Http/Controllers/Admin/OrderController';
import {
    create as createEngagement,
    destroy as destroyEngagement,
    index as engagementsIndex,
    show as showEngagement,
} from '@/actions/App/Http/Controllers/Admin/ServiceEngagementController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CopyableOrderNumber } from '@/components/copy-button';
import { EngagementStatusBadge } from '@/components/engagement-status-badge';
import { PagePanel } from '@/components/page-panel';
import { SearchFilter } from '@/components/search-filter';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatNpr } from '@/lib/currency';

type Engagement = {
    id: number;
    status: string;
    status_label: string;
    source: string;
    project_name: string | null;
    payment_status: string;
    project_completion_date: string | null;
    invoice_paid_at: string | null;
    total_npr: number;
    due_npr: number;
    user: { id: number; name: string; email: string } | null;
    product: { id: number; title: string } | null;
    variant: { id: number; name: string } | null;
    assigned_by: string | null;
    order: { id: number; order_number: string } | null;
    created_at: string | null;
};

export default function ServicesIndex({
    engagements,
    filters,
}: {
    engagements: Engagement[];
    filters: { search?: string };
}) {
    const [deletingId, setDeletingId] = useState<number | null>(null);
    /**
     * The engagement awaiting delete confirmation. One dialog is driven by this
     * value rather than one per row, so the table stays cheap to render.
     */
    const [engagementToDelete, setEngagementToDelete] =
        useState<Engagement | null>(null);

    const handleDelete = (engagement: Engagement) => {
        setDeletingId(engagement.id);

        router.delete(
            destroyEngagement.url({ serviceEngagement: engagement.id }),
            {
                preserveScroll: true,
                onFinish: () => setDeletingId(null),
            },
        );
    };

    return (
        <>
            <SeoHead title="Service Engagements" />

            <PagePanel
                title="Service Engagements"
                variant="transparent"
                actions={
                    <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                        <SearchFilter
                            href={engagementsIndex.url()}
                            currentSearch={filters?.search ?? ''}
                            placeholder="Search engagements..."
                        />
                        <Button asChild className="w-fit">
                            <Link href={createEngagement.url()}>
                                Assign Service
                            </Link>
                        </Button>
                    </div>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Project Name</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead>Service Status</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Completion Date</TableHead>
                            <TableHead>Invoice Paid Date</TableHead>
                            <TableHead className="text-right">
                                Total Amount
                            </TableHead>
                            <TableHead className="text-right">
                                Due Amount
                            </TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {engagements.map((engagement) => (
                            <TableRow key={engagement.id}>
                                <TableCell>
                                    <div className="font-medium">
                                        {engagement.project_name ?? '—'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {engagement.product?.title ?? 'Service'}
                                        {engagement.variant
                                            ? ` · ${engagement.variant.name}`
                                            : ''}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {engagement.order ? (
                                        <CopyableOrderNumber
                                            orderNumber={
                                                engagement.order.order_number
                                            }
                                        >
                                            <Link
                                                href={
                                                    showOrder(
                                                        engagement.order.id,
                                                    ).url
                                                }
                                                className="font-medium text-primary hover:underline"
                                            >
                                                {engagement.order.order_number}
                                            </Link>
                                        </CopyableOrderNumber>
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">
                                        {engagement.user?.name ?? '—'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {engagement.user?.email}
                                    </div>
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
                                <TableCell className="text-muted-foreground">
                                    {engagement.invoice_paid_at ?? '—'}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatNpr(engagement.total_npr)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatNpr(engagement.due_npr)}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link
                                                href={showEngagement.url({
                                                    serviceEngagement:
                                                        engagement.id,
                                                })}
                                            >
                                                Open
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            disabled={
                                                deletingId === engagement.id
                                            }
                                            onClick={() =>
                                                setEngagementToDelete(
                                                    engagement,
                                                )
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {engagements.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={10}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {filters?.search
                                        ? 'No engagements match your search.'
                                        : 'No service engagements yet.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>

            {engagementToDelete && (
                <ConfirmDialog
                    title={
                        <>
                            Are you sure you want to delete{' '}
                            {engagementToDelete.project_name ??
                                'this engagement'}
                            ?
                        </>
                    }
                    description="This permanently removes the engagement and its invoices. This cannot be undone."
                    onConfirm={() => handleDelete(engagementToDelete)}
                    onOpenChange={() => setEngagementToDelete(null)}
                />
            )}
        </>
    );
}

ServicesIndex.layout = {
    breadcrumbs: [{ title: 'Services', href: engagementsIndex().url }],
};
