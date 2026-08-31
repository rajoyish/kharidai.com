import { EngagementStatusBadge } from '@/components/engagement-status-badge';
import { PaymentStatusBadge } from '@/components/status-badge';
import { formatNpr } from '@/lib/currency';

export type ServiceInvoice = {
    id: number;
    project_name: string | null;
    status: string;
    status_label: string;
    payment_status?: string;
    line_items: {
        label: string;
        quantity: number;
        unit_price_npr: number;
    }[];
    subtotal_npr: number;
    tax_rate: number;
    tax_npr: number;
    grand_total_npr: number;
    advance_paid_npr: number;
    due_npr: number;
    project_completion_date: string | null;
};

interface ServiceInvoiceCardProps {
    invoice: ServiceInvoice;
    className?: string;
}

export function ServiceInvoiceCard({
    invoice,
    className = '',
}: ServiceInvoiceCardProps) {
    const hasInvoice = invoice.line_items.length > 0;

    return (
        <div
            className={`mt-3 w-full rounded-lg border bg-card p-4 sm:p-5 ${className}`}
        >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {invoice.project_name ?? 'Invoice'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <EngagementStatusBadge
                        status={invoice.status}
                        label={invoice.status_label}
                    />
                    {hasInvoice && (
                        <PaymentStatusBadge
                            paid={invoice.payment_status === 'paid'}
                        />
                    )}
                </div>
            </div>

            {!hasInvoice && (
                <p className="text-sm text-muted-foreground">
                    No invoice has been prepared for this service yet. The
                    status above tracks its progress in the meantime.
                </p>
            )}

            {hasInvoice && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted-foreground">
                                    <th className="pb-2 font-medium">
                                        Description
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                        Qty
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                        Rate
                                    </th>
                                    <th className="pb-2 text-right font-medium">
                                        Amount
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {invoice.line_items.map((line, i) => (
                                    <tr key={i}>
                                        <td className="py-2.5 pr-2">
                                            {line.label}
                                        </td>
                                        <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                                            {line.quantity}
                                        </td>
                                        <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">
                                            {formatNpr(line.unit_price_npr)}
                                        </td>
                                        <td className="py-2.5 pl-2 text-right whitespace-nowrap tabular-nums">
                                            {formatNpr(
                                                line.quantity *
                                                    line.unit_price_npr,
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                                Sub Total
                            </span>
                            <span className="tabular-nums">
                                {formatNpr(invoice.subtotal_npr)}
                            </span>
                        </div>
                        {invoice.tax_rate > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Tax ({invoice.tax_rate}%)
                                </span>
                                <span className="tabular-nums">
                                    {formatNpr(invoice.tax_npr)}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-1 font-semibold">
                            <span>Grand Total</span>
                            <span className="tabular-nums">
                                {formatNpr(invoice.grand_total_npr)}
                            </span>
                        </div>

                        {invoice.advance_paid_npr > 0 && (
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">
                                    Advance Paid
                                </span>
                                <span className="tabular-nums">
                                    {formatNpr(invoice.advance_paid_npr)}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-1 font-bold">
                            <span>Due Amount</span>
                            <span className="tabular-nums">
                                {formatNpr(invoice.due_npr)}
                            </span>
                        </div>

                        {invoice.project_completion_date && (
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-muted-foreground">
                                    Completion Date
                                </span>
                                <span>{invoice.project_completion_date}</span>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
