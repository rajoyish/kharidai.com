import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

import { show as showOrder } from '@/actions/App/Http/Controllers/Admin/OrderController';
import {
    create as createEngagement,
    destroy as destroyEngagement,
    show as showEngagement,
} from '@/actions/App/Http/Controllers/Admin/ServiceEngagementController';
import { EngagementStatusBadge } from '@/components/engagement-status-badge';
import { PagePanel } from '@/components/page-panel';
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

type Engagement = {
    id: number;
    status: string;
    status_label: string;
    source: string;
    project_name: string | null;
    payment_status: string;
    project_completion_date: string | null;
    total_npr: number;
    due_npr: number;
    user: { id: number; name: string; email: string } | null;
    product: { id: number; title: string } | null;
    variant: { id: number; name: string } | null;
    assigned_by: string | null;
    order: { id: number; order_number: string } | null;
    created_at: string | null;
};

const rs = (value: number): string =>
    `Rs ${Math.round(value).toLocaleString('en-IN')}`;

export default function ServicesIndex({
    engagements,
}: {
    engagements: Engagement[];
}) {
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = (engagement: Engagement) => {
        const label = engagement.project_name ?? 'this engagement';

        if (confirm(`Are you sure you want to delete ${label}?`)) {
            setDeletingId(engagement.id);

            router.delete(
                destroyEngagement.url({ serviceEngagement: engagement.id }),
                {
                    preserveScroll: true,
                    onFinish: () => setDeletingId(null),
                },
            );
        }
    };

    return (
        <>
            <SeoHead title="Service Engagements" />

            <PagePanel
                title="Service Engagements"
                variant="transparent"
                actions={
                    <Button asChild className="w-fit">
                        <Link href={createEngagement.url()}>
                            Assign Service
                        </Link>
                    </Button>
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
                                        <Link
                                            href={
                                                showOrder(engagement.order.id)
                                                    .url
                                            }
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {engagement.order.order_number}
                                        </Link>
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
                                <TableCell className="text-right tabular-nums">
                                    {rs(engagement.total_npr)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {rs(engagement.due_npr)}
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
                                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                            disabled={
                                                deletingId === engagement.id
                                            }
                                            onClick={() =>
                                                handleDelete(engagement)
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
                                    colSpan={9}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No service engagements yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

ServicesIndex.layout = {
    breadcrumbs: [{ title: 'Services', href: '/admin/services' }],
};
