import { Link, router, useForm } from '@inertiajs/react';
import { Check, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { show as showAdminOrder } from '@/actions/App/Http/Controllers/Admin/OrderController';
import {
    assignOrder,
    linkOrder,
    saveInvoice,
    updatePaymentStatus,
} from '@/actions/App/Http/Controllers/Admin/ServiceEngagementController';
import InputError from '@/components/input-error';
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
    order: { id: number; order_number: string } | null;
};

type LinkableOrderItem = {
    id: number;
    order_number: string;
    label: string;
};

/** Whole-rupee formatting with thousands separators, e.g. 32000 → "Rs 32,000". */
function rs(value: number): string {
    return `Rs ${Math.round(value).toLocaleString('en-IN')}`;
}

const num = (value: number | string): number => Number(value) || 0;

export default function ServiceInvoice({
    engagement,
    lineItemSuggestions,
    linkableOrderItems,
}: {
    engagement: Engagement;
    lineItemSuggestions: LineItem[];
    linkableOrderItems: LinkableOrderItem[];
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

    // Assigning an order gives the customer something payable; either generate a
    // fresh order from the invoice or link one they already placed.
    const [assigningOrder, setAssigningOrder] = useState(false);
    const [selectedOrderItem, setSelectedOrderItem] = useState<string>('');

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

    const submitLinkOrder = () => {
        if (!selectedOrderItem) {
            return;
        }

        setAssigningOrder(true);
        router.post(
            linkOrder.url({ serviceEngagement: engagement.id }),
            { order_item_id: Number(selectedOrderItem) },
            {
                preserveScroll: true,
                onFinish: () => setAssigningOrder(false),
            },
        );
    };

    return (
        <>
            <SeoHead title="Invoice Brief" />

            <PagePanel
                eyebrow={`${engagement.user.name} · ${engagement.product?.title ?? 'Service'}`}
                title="Invoice Brief Generator"
                variant="transparent"
                actions={
                    <Badge variant={paid ? 'default' : 'secondary'}>
                        {paid ? 'Paid' : 'Due'}
                    </Badge>
                }
            >
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
                    ) : (
                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Button
                                    type="button"
                                    className="w-fit"
                                    disabled={
                                        assigningOrder || !engagement.invoice_ready
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

                            {linkableOrderItems.length > 0 && (
                                <div className="grid gap-2 border-t pt-5">
                                    <Label>Or link an existing order</Label>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Select
                                            value={selectedOrderItem}
                                            onValueChange={setSelectedOrderItem}
                                        >
                                            <SelectTrigger className="sm:w-80">
                                                <SelectValue placeholder="Select an order" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {linkableOrderItems.map(
                                                    (item) => (
                                                        <SelectItem
                                                            key={item.id}
                                                            value={String(
                                                                item.id,
                                                            )}
                                                        >
                                                            {item.label}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={
                                                assigningOrder ||
                                                !selectedOrderItem
                                            }
                                            onClick={submitLinkOrder}
                                        >
                                            Link Order
                                        </Button>
                                    </div>
                                </div>
                            )}
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
