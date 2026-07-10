import { Link, router, useForm } from '@inertiajs/react';
import { Check, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { show as showAdminOrder } from '@/actions/App/Http/Controllers/Admin/OrderController';
import {
    assignOrder,
    complete,
    recordAdvance,
    saveInvoice,
    signContract,
    updatePaymentStatus,
    updateStatus,
} from '@/actions/App/Http/Controllers/Admin/ServiceEngagementController';
import { EngagementStatusBadge } from '@/components/engagement-status-badge';
import InputError from '@/components/input-error';
import { LightboxImageLink } from '@/components/lightbox-image-link';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type LineItem = {
    label: string;
    quantity: number | string;
    unit_price_npr: number | string;
};

type Engagement = {
    id: number;
    status: string;
    status_label: string;
    project_name: string | null;
    line_items: LineItem[];
    tax_rate: number;
    advance_paid_npr: number;
    project_completion_date: string | null;
    payment_status: string;
    is_paid: boolean;
    invoice_ready: boolean;
    user: { id: number; name: string; email: string };
    product: { id: number; title: string } | null;
    variant: { id: number; name: string } | null;
    brief: { note?: string } | null;
    order: {
        id: number;
        order_number: string;
        payment_receipt: {
            id: number;
            file_path: string;
            status: string;
        } | null;
    } | null;
    advance_required_npr: number;
};

/** A status this engagement may move to; blocked ones carry the reason why. */
type StatusOption = {
    value: string;
    label: string;
    blocked_reason: string | null;
};

/** Whole-rupee formatting with thousands separators, e.g. 32000 → "Rs 32,000". */
function rs(value: number): string {
    return `Rs ${Math.round(value).toLocaleString('en-IN')}`;
}

const num = (value: number | string): number => Number(value) || 0;

export default function ServiceInvoice({
    engagement,
    lineItemSuggestions,
    statusOptions,
}: {
    engagement: Engagement;
    lineItemSuggestions: LineItem[];
    statusOptions: StatusOption[];
}) {
    // Prefill from a previously saved invoice, otherwise seed the editable rows
    // from the service's pricing strategy so the admin starts with the right
    // labels and rates.
    const initialLineItems: LineItem[] = (
        engagement.line_items.length > 0
            ? engagement.line_items
            : lineItemSuggestions
    ).map((item) => ({
        label: item.label,
        quantity: num(item.quantity) ? String(num(item.quantity)) : '',
        unit_price_npr: String(num(item.unit_price_npr)),
    }));

    const {
        data,
        setData,
        patch,
        processing,
        errors,
        isDirty,
        recentlySuccessful,
        setDefaults,
    } = useForm({
        project_name: engagement.project_name ?? '',
        line_items:
            initialLineItems.length > 0
                ? initialLineItems
                : [{ label: '', quantity: '', unit_price_npr: '' }],
        tax_rate: String(engagement.tax_rate ?? 13),
        advance_paid_npr: engagement.advance_paid_npr
            ? String(engagement.advance_paid_npr)
            : '',
        project_completion_date: engagement.project_completion_date ?? '',
    });

    const updateLineItem = (
        index: number,
        key: keyof LineItem,
        value: string,
    ) => {
        const next = [...data.line_items];
        next[index] = { ...next[index], [key]: value };
        setData('line_items', next);
    };

    const addLineItem = () => {
        setData('line_items', [
            ...data.line_items,
            { label: '', quantity: '', unit_price_npr: '' },
        ]);
    };

    const removeLineItem = (index: number) => {
        setData(
            'line_items',
            data.line_items.filter((_, i) => i !== index),
        );
    };

    const subtotal = data.line_items.reduce(
        (sum, item) => sum + num(item.quantity) * num(item.unit_price_npr),
        0,
    );
    const tax = (subtotal * num(data.tax_rate)) / 100;
    const grandTotal = subtotal + tax;
    const advance = num(data.advance_paid_npr);
    const due = Math.max(0, grandTotal - advance);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(saveInvoice.url({ serviceEngagement: engagement.id }), {
            preserveScroll: true,
            // Rebase the dirty baseline to the saved values so the button
            // disables again and the "Saved" indicator can show.
            onSuccess: () => setDefaults(),
        });
    };

    // The payment status is an explicit override persisted on its own, separate
    // from the invoice form so toggling it never depends on unsaved edits.
    const [paid, setPaid] = useState(engagement.is_paid);
    const [updatingPayment, setUpdatingPayment] = useState(false);

    const togglePaid = (next: boolean) => {
        setPaid(next);
        setUpdatingPayment(true);
        router.patch(
            updatePaymentStatus.url({ serviceEngagement: engagement.id }),
            { is_paid: next },
            {
                preserveScroll: true,
                onError: () => setPaid(!next),
                onFinish: () => setUpdatingPayment(false),
            },
        );
    };

    // Assigning an order gives the customer something payable.
    const [assigningOrder, setAssigningOrder] = useState(false);

    const createOrder = () => {
        setAssigningOrder(true);
        router.post(
            assignOrder.url({ serviceEngagement: engagement.id }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setAssigningOrder(false),
            },
        );
    };

    // The lifecycle status moves through the guarded state machine, so the
    // contract and advance gates get their own actions: they are the only way
    // to satisfy the pre-conditions for reaching "In progress".
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [nextStatus, setNextStatus] = useState<string>('');

    const runStatusAction = (url: string, payload: Record<string, number>) => {
        setUpdatingStatus(true);
        router.post(url, payload, {
            preserveScroll: true,
            onFinish: () => setUpdatingStatus(false),
        });
    };

    const submitStatus = () => {
        if (!nextStatus) {
            return;
        }

        setUpdatingStatus(true);
        router.patch(
            updateStatus.url({ serviceEngagement: engagement.id }),
            { status: nextStatus },
            {
                preserveScroll: true,
                onSuccess: () => setNextStatus(''),
                onFinish: () => setUpdatingStatus(false),
            },
        );
    };

    const [advanceAmount, setAdvanceAmount] = useState<string>('');

    const awaitingContract = engagement.status === 'pending_contract';
    const awaitingAdvance = engagement.status === 'awaiting_advance';
    const takeableStatuses = statusOptions.filter(
        (option) => option.blocked_reason === null,
    );
    const canComplete = takeableStatuses.some(
        (option) => option.value === 'completed',
    );

    return (
        <>
            <SeoHead title="Invoice Brief" />

            <PagePanel
                eyebrow={`${engagement.user.name} · ${engagement.product?.title ?? 'Service'}`}
                title="Invoice Brief Generator"
                variant="transparent"
                actions={
                    <div className="flex items-center gap-2">
                        <EngagementStatusBadge
                            status={engagement.status}
                            label={engagement.status_label}
                        />
                        <Badge variant={paid ? 'default' : 'secondary'}>
                            {paid ? 'Paid' : 'Due'}
                        </Badge>
                    </div>
                }
            >
                <div className="mb-6 grid max-w-3xl gap-4 rounded-xl border bg-card p-6">
                    <div>
                        <h2 className="text-base font-semibold">
                            Service Status
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Where this engagement sits in its lifecycle. The
                            customer sees this on their order and services
                            pages.
                        </p>
                    </div>

                    {awaitingContract && (
                        <div className="grid gap-2 rounded-md border bg-muted/40 p-3">
                            <p className="text-sm">
                                Work cannot begin until the contract is signed.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-fit"
                                disabled={updatingStatus}
                                onClick={() =>
                                    runStatusAction(
                                        signContract.url({
                                            serviceEngagement: engagement.id,
                                        }),
                                        {},
                                    )
                                }
                            >
                                Mark contract as signed
                            </Button>
                        </div>
                    )}

                    {awaitingAdvance && (
                        <div className="grid gap-2 rounded-md border bg-muted/40 p-3">
                            <p className="text-sm">
                                Work begins once the advance of{' '}
                                {rs(engagement.advance_required_npr)} is paid in
                                full.
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Input
                                    type="number"
                                    min={0}
                                    className="sm:w-48"
                                    placeholder="Amount received"
                                    value={advanceAmount}
                                    onChange={(e) =>
                                        setAdvanceAmount(e.target.value)
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={updatingStatus || !advanceAmount}
                                    onClick={() =>
                                        runStatusAction(
                                            recordAdvance.url({
                                                serviceEngagement:
                                                    engagement.id,
                                            }),
                                            { amount_npr: num(advanceAmount) },
                                        )
                                    }
                                >
                                    Record advance
                                </Button>
                            </div>
                        </div>
                    )}

                    {statusOptions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {engagement.status_label} is a final state; this
                            engagement can no longer change status.
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            <Label htmlFor="next_status">Move status to</Label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Select
                                    value={nextStatus}
                                    onValueChange={setNextStatus}
                                >
                                    <SelectTrigger
                                        id="next_status"
                                        className="sm:w-72"
                                    >
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                disabled={
                                                    option.blocked_reason !==
                                                    null
                                                }
                                            >
                                                {option.label}
                                                {option.blocked_reason && (
                                                    <span className="text-muted-foreground">
                                                        {' '}
                                                        —{' '}
                                                        {option.blocked_reason}
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    disabled={updatingStatus || !nextStatus}
                                    onClick={submitStatus}
                                >
                                    Update status
                                </Button>
                            </div>
                            {takeableStatuses.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Every next status is blocked until the step
                                    above is completed.
                                </p>
                            )}
                        </div>
                    )}

                    {canComplete && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
                            <p className="text-sm">
                                Work delivered and settled? Close this
                                engagement out.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={updatingStatus}
                                onClick={() =>
                                    runStatusAction(
                                        complete.url({
                                            serviceEngagement: engagement.id,
                                        }),
                                        {},
                                    )
                                }
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Mark as Completed
                            </Button>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={submit}
                    className="grid max-w-3xl gap-6 rounded-xl border bg-card p-6"
                >
                    {engagement.brief?.note && (
                        <div className="rounded-md border border-dashed bg-muted/40 p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">
                                Service Requirements
                            </p>
                            <p className="mt-1 text-sm whitespace-pre-line">
                                {engagement.brief.note}
                            </p>
                        </div>
                    )}

                    <div className="grid gap-1">
                        <Label htmlFor="project_name">Project Name</Label>
                        <Input
                            id="project_name"
                            value={data.project_name}
                            onChange={(e) =>
                                setData('project_name', e.target.value)
                            }
                            placeholder="e.g. Good Management"
                        />
                        <InputError message={errors.project_name} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label>Line Items</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addLineItem}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add line
                            </Button>
                        </div>

                        <div className="grid gap-2">
                            <div className="hidden grid-cols-[1fr_5rem_7rem_7rem_2rem] gap-2 text-xs font-medium text-muted-foreground sm:grid">
                                <span>Description</span>
                                <span className="text-right">Qty</span>
                                <span className="text-right">Rate (Rs)</span>
                                <span className="text-right">Amount</span>
                                <span />
                            </div>
                            {data.line_items.map((item, index) => (
                                <div
                                    key={index}
                                    className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_5rem_7rem_7rem_2rem] sm:items-center"
                                >
                                    <Input
                                        className="col-span-2 sm:col-span-1"
                                        value={item.label}
                                        onChange={(e) =>
                                            updateLineItem(
                                                index,
                                                'label',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="e.g. Cover Pages"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        className="text-right"
                                        value={item.quantity}
                                        onChange={(e) =>
                                            updateLineItem(
                                                index,
                                                'quantity',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Qty"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        className="text-right"
                                        value={item.unit_price_npr}
                                        onChange={(e) =>
                                            updateLineItem(
                                                index,
                                                'unit_price_npr',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Rate"
                                    />
                                    <div className="self-center text-right text-sm font-medium tabular-nums">
                                        {rs(
                                            num(item.quantity) *
                                                num(item.unit_price_npr),
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => removeLineItem(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <InputError message={errors.line_items} />
                    </div>

                    <div className="grid gap-3 border-t pt-4 sm:ml-auto sm:w-80">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                Sub Total
                            </span>
                            <span className="font-medium tabular-nums">
                                {rs(subtotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground">
                                Tax
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="any"
                                    className="h-8 w-16 text-right"
                                    value={data.tax_rate}
                                    onChange={(e) =>
                                        setData('tax_rate', e.target.value)
                                    }
                                />
                                %
                            </span>
                            <span className="font-medium tabular-nums">
                                {rs(tax)}
                            </span>
                        </div>
                        <InputError message={errors.tax_rate} />
                        <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                            <span>Grand Total</span>
                            <span className="tabular-nums">
                                {rs(grandTotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-sm">
                            <Label
                                htmlFor="advance_paid_npr"
                                className="text-muted-foreground"
                            >
                                Advance Paid
                            </Label>
                            <Input
                                id="advance_paid_npr"
                                type="number"
                                min="0"
                                step="any"
                                className="h-8 w-28 text-right"
                                value={data.advance_paid_npr}
                                onChange={(e) =>
                                    setData('advance_paid_npr', e.target.value)
                                }
                            />
                        </div>
                        <InputError message={errors.advance_paid_npr} />
                        <div className="flex items-center justify-between text-base font-semibold">
                            <span>Due Amount</span>
                            <span className="tabular-nums">{rs(due)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <Label
                                htmlFor="payment_status"
                                className="text-muted-foreground"
                            >
                                Payment Status
                            </Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                    {paid ? 'Paid' : 'Due'}
                                </span>
                                <Switch
                                    id="payment_status"
                                    checked={paid}
                                    disabled={updatingPayment}
                                    onCheckedChange={togglePaid}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-1 border-t pt-4 sm:max-w-xs">
                        <Label htmlFor="project_completion_date">
                            Project Completion Date
                        </Label>
                        <Input
                            id="project_completion_date"
                            type="date"
                            value={data.project_completion_date}
                            onChange={(e) =>
                                setData(
                                    'project_completion_date',
                                    e.target.value,
                                )
                            }
                        />
                        <InputError message={errors.project_completion_date} />
                    </div>

                    <div className="flex items-center gap-3">
                        <Button type="submit" disabled={processing || !isDirty}>
                            {processing ? 'Saving…' : 'Save Invoice Brief'}
                        </Button>
                        {recentlySuccessful && !isDirty && (
                            <span className="flex items-center gap-1 text-sm text-emerald-600">
                                <Check className="h-4 w-4" /> Saved
                            </span>
                        )}
                    </div>
                </form>

                <div className="mt-6 grid max-w-3xl gap-4 rounded-xl border bg-card p-6">
                    <div>
                        <h2 className="text-base font-semibold">
                            Customer Order
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Give the customer a payable order so they can view
                            and settle this invoice from their panel.
                        </p>
                    </div>

                    {engagement.order ? (
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
                                <div className="text-sm">
                                    <span className="text-muted-foreground">
                                        Linked to order{' '}
                                    </span>
                                    <span className="font-medium">
                                        {engagement.order.order_number}
                                    </span>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link
                                        href={showAdminOrder.url({
                                            order: engagement.order.id,
                                        })}
                                    >
                                        Open order
                                        <ExternalLink className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>

                            {engagement.order.payment_receipt ? (
                                <div className="grid gap-2 rounded-md border p-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium">
                                            Payment Receipt
                                        </p>
                                        <span
                                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                                                engagement.order.payment_receipt
                                                    .status === 'approved'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                    : engagement.order
                                                            .payment_receipt
                                                            .status ===
                                                        'rejected'
                                                      ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                            }`}
                                        >
                                            {
                                                engagement.order.payment_receipt
                                                    .status
                                            }
                                        </span>
                                    </div>
                                    <div className="overflow-hidden rounded-md border bg-muted p-2">
                                        <LightboxImageLink
                                            src={`/storage/${engagement.order.payment_receipt.file_path}`}
                                            alt="Payment Receipt"
                                            ariaLabel="View full-size payment receipt"
                                            className="w-full"
                                            imageClassName="h-auto max-h-48 w-full object-contain transition-opacity hover:opacity-90"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Verify the payment, then flip the
                                        Payment Status toggle above to mark this
                                        invoice as paid.
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    The customer has not uploaded a payment
                                    receipt yet.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Button
                                    type="button"
                                    className="w-fit"
                                    disabled={
                                        assigningOrder ||
                                        !engagement.invoice_ready
                                    }
                                    onClick={createOrder}
                                >
                                    Create Order from Invoice
                                </Button>
                                {!engagement.invoice_ready && (
                                    <p className="text-xs text-muted-foreground">
                                        Save the invoice brief above first.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </PagePanel>
        </>
    );
}

ServiceInvoice.layout = {
    breadcrumbs: [
        { title: 'Services', href: '/admin/services' },
        { title: 'Invoice Brief', href: '#' },
    ],
};
