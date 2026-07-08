const rs = (value: number): string =>
    new Intl.NumberFormat('en-IN', {
        maximumFractionDigits: 0,
    }).format(value);

export type ServiceInvoice = {
    id: number;
    project_name: string | null;
    status_label?: string;
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

export function ServiceInvoiceCard({ invoice, className = '' }: ServiceInvoiceCardProps) {
    const badgeContent = invoice.status_label 
        ? invoice.status_label 
        : (invoice.payment_status === 'paid' ? 'Paid' : 'Due');
        
    const badgeClass = invoice.status_label 
        ? "bg-muted text-muted-foreground"
        : (invoice.payment_status === 'paid'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200');

    return (
        <div className={`mt-3 rounded-lg border bg-card p-4 sm:p-5 w-full ${className}`}>
            <div className="mb-4 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                    {invoice.project_name ?? 'Invoice'}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeClass}`}>
                    {badgeContent}
                </span>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-muted-foreground">
                            <th className="pb-2 font-medium">Description</th>
                            <th className="pb-2 text-right font-medium">Qty</th>
                            <th className="pb-2 text-right font-medium">Rate</th>
                            <th className="pb-2 text-right font-medium">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {invoice.line_items.map((line, i) => (
                            <tr key={i}>
                                <td className="py-2.5 pr-2">{line.label}</td>
                                <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap">
                                    {line.quantity}
                                </td>
                                <td className="py-2.5 px-2 text-right tabular-nums whitespace-nowrap">
                                    Rs {rs(line.unit_price_npr)}
                                </td>
                                <td className="py-2.5 pl-2 text-right tabular-nums whitespace-nowrap">
                                    Rs {rs(line.quantity * line.unit_price_npr)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sub Total</span>
                    <span className="tabular-nums">Rs {rs(invoice.subtotal_npr)}</span>
                </div>
                {invoice.tax_rate > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                            Tax ({invoice.tax_rate}%)
                        </span>
                        <span className="tabular-nums">Rs {rs(invoice.tax_npr)}</span>
                    </div>
                )}
                <div className="flex items-center justify-between font-semibold pt-1">
                    <span>Grand Total</span>
                    <span className="tabular-nums">Rs {rs(invoice.grand_total_npr)}</span>
                </div>
                
                {invoice.advance_paid_npr > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Advance Paid</span>
                        <span className="tabular-nums">Rs {rs(invoice.advance_paid_npr)}</span>
                    </div>
                )}
                
                <div className="flex items-center justify-between font-bold pt-1">
                    <span>Due Amount</span>
                    <span className="tabular-nums">Rs {rs(invoice.due_npr)}</span>
                </div>
                
                {invoice.project_completion_date && (
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-muted-foreground">Completion Date</span>
                        <span>{invoice.project_completion_date}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
