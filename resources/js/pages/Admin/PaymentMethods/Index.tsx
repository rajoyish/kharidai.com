import { router } from '@inertiajs/react';

import { update as updatePaymentMethod } from '@/actions/App/Http/Controllers/Admin/PaymentMethodController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { index as paymentMethodsIndex } from '@/routes/admin/payment-methods';

type AdminPaymentMethod = {
    id: number;
    key: string;
    label: string;
    is_enabled: boolean;
};

export default function PaymentMethodsIndex({
    paymentMethods,
}: {
    paymentMethods: AdminPaymentMethod[];
}) {
    const toggle = (method: AdminPaymentMethod, isEnabled: boolean) => {
        router.patch(
            updatePaymentMethod.url(method.id),
            { is_enabled: isEnabled },
            { preserveScroll: true },
        );
    };

    return (
        <>
            <SeoHead title="Payment Methods" />
            <PagePanel
                title="Payment Methods"
                description="Turn a provider off while it is down. Disabled providers stay visible to customers but cannot be selected on any payment page."
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Provider</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                In service
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paymentMethods.map((method) => (
                            <TableRow key={method.id}>
                                <TableCell className="font-medium">
                                    {method.label}
                                </TableCell>
                                <TableCell>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            method.is_enabled
                                                ? 'bg-success-surface text-success'
                                                : 'bg-warning-surface text-warning'
                                        }`}
                                    >
                                        {method.is_enabled
                                            ? 'Available'
                                            : 'Down'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Switch
                                        checked={method.is_enabled}
                                        aria-label={`Toggle ${method.label}`}
                                        onCheckedChange={(checked) =>
                                            toggle(method, checked)
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

PaymentMethodsIndex.layout = {
    breadcrumbs: [
        { title: 'Payment Methods', href: paymentMethodsIndex().url },
    ],
};
