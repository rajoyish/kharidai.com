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
import { home } from '@/routes';
import { index as servicesIndex } from '@/routes/account/services';

type Engagement = {
    id: number;
    status: string;
    price_npr: number;
    product: { id: number; title: string } | null;
    variant: { id: number; name: string } | null;
    order_number: string | null;
    delivery_note: string | null;
    created_at: string | null;
};

const statusVariant = (status: string) => {
    if (status === 'completed' || status === 'delivered') {
        return 'default' as const;
    }

    if (status === 'cancelled') {
        return 'destructive' as const;
    }

    return 'secondary' as const;
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
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Requested</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {engagements.map((engagement) => (
                            <TableRow key={engagement.id}>
                                <TableCell className="font-medium">
                                    {engagement.product?.title ?? '—'}
                                    {engagement.delivery_note && (
                                        <div className="text-xs text-muted-foreground">
                                            {engagement.delivery_note}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {engagement.variant?.name ?? '—'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {engagement.order_number ?? 'Admin assigned'}
                                </TableCell>
                                <TableCell>
                                    Rs. {engagement.price_npr.toFixed(0)}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={statusVariant(
                                            engagement.status,
                                        )}
                                        className="capitalize"
                                    >
                                        {engagement.status.replace('_', ' ')}
                                    </Badge>
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
