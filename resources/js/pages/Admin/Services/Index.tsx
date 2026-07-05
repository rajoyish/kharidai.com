import { Link, router } from '@inertiajs/react';
import {
    create as createEngagement,
    updateStatus,
} from '@/actions/App/Http/Controllers/Admin/ServiceEngagementController';
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
    source: string;
    price_npr: number;
    user: { id: number; name: string; email: string } | null;
    product: { id: number; title: string } | null;
    variant: { id: number; name: string } | null;
    assigned_by: string | null;
    created_at: string | null;
};

const selectClassName =
    'h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:outline-none';

export default function ServicesIndex({
    engagements,
    statuses,
}: {
    engagements: Engagement[];
    statuses: string[];
}) {
    const changeStatus = (engagement: Engagement, status: string) => {
        router.patch(
            updateStatus.url({ serviceEngagement: engagement.id }),
            { status },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <SeoHead title="Service Engagements" />

            <PagePanel
                title="Service Engagements"
                variant="transparent"
                actions={
                    <Button asChild className="w-full sm:w-auto">
                        <Link href={createEngagement.url()}>Assign Service</Link>
                    </Button>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {engagements.map((engagement) => (
                            <TableRow key={engagement.id}>
                                <TableCell>
                                    <div className="font-medium">
                                        {engagement.user?.name ?? '—'}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {engagement.user?.email}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium">
                                        {engagement.product?.title ?? '—'}
                                    </div>
                                    {engagement.variant && (
                                        <div className="text-xs text-muted-foreground">
                                            {engagement.variant.name}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary">
                                        {engagement.source === 'admin'
                                            ? `Admin${engagement.assigned_by ? ` (${engagement.assigned_by})` : ''}`
                                            : 'Storefront'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    Rs. {engagement.price_npr.toFixed(0)}
                                </TableCell>
                                <TableCell>
                                    <select
                                        className={selectClassName}
                                        value={engagement.status}
                                        onChange={(e) =>
                                            changeStatus(
                                                engagement,
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {statuses.map((status) => (
                                            <option key={status} value={status}>
                                                {status.replace('_', ' ')}
                                            </option>
                                        ))}
                                    </select>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {engagement.created_at}
                                </TableCell>
                            </TableRow>
                        ))}
                        {engagements.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
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
