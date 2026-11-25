import { router, useForm } from '@inertiajs/react';
import { Pencil, Trash2, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
    destroyRefund,
    saveRefund,
} from '@/actions/App/Http/Controllers/Admin/OrderController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { LightboxImageLink } from '@/components/lightbox-image-link';
import { hasProratedRefund } from '@/components/prorated-refund-badge';
import type { OrderRefund } from '@/components/prorated-refund-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatNpr } from '@/lib/currency';

/** A subscription bought in the order, with the unit price it was paid at. */
export type RefundableSubscription = {
    id: number;
    start_date: string;
    end_date: string | null;
    order_item: { price: string | number } | null;
};

const DAY_MS = 1000 * 60 * 60 * 24;

function toUtcDay(date: string): number {
    const [year, month, day] = date.split(' ')[0].split('-').map(Number);

    return Date.UTC(year, month - 1, day);
}

function today(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * The unused share of every time-bound subscription in the order, priced at
 * what was paid for it, as of the refund date. Lifetime subscriptions have no
 * unused share to prorate and are skipped.
 */
function suggestProratedAmount(
    subscriptions: RefundableSubscription[],
    refundedOn: string,
): { amount: number; unusedDays: number; totalDays: number } | null {
    if (!refundedOn) {
        return null;
    }

    const refundDay = toUtcDay(refundedOn);
    let amount = 0;
    let unusedDays = 0;
    let totalDays = 0;

    for (const subscription of subscriptions) {
        if (!subscription.end_date || !subscription.order_item) {
            continue;
        }

        const start = toUtcDay(subscription.start_date);
        const end = toUtcDay(subscription.end_date);
        const total = Math.round((end - start) / DAY_MS);

        if (total <= 0) {
            continue;
        }

        const unused = Math.min(
            Math.max(
                Math.round((end - Math.max(refundDay, start)) / DAY_MS),
                0,
            ),
            total,
        );

        amount += (Number(subscription.order_item.price) * unused) / total;
        unusedDays += unused;
        totalDays += total;
    }

    if (totalDays === 0) {
        return null;
    }

    return { amount: Math.round(amount * 100) / 100, unusedDays, totalDays };
}

/**
 * Where an admin records the part of a paid order handed back to the customer:
 * how much, when, and a screenshot of the transfer. The refund comes out of the
 * order's profit, so the tithe it owes drops with it.
 */
export function ProratedRefundPanel({
    order,
    subscriptions,
}: {
    order: OrderRefund & { id: number; order_number: string };
    subscriptions: RefundableSubscription[];
}) {
    const isRefunded = hasProratedRefund(order);
    const [isEditing, setIsEditing] = useState(false);
    const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<{
            amount: string;
            refunded_on: string;
            receipt: File | null;
            note: string;
        }>({
            amount: isRefunded ? String(order.refund_amount) : '',
            refunded_on: order.refunded_on ?? today(),
            receipt: null,
            note: order.refund_note ?? '',
        });

    const suggestion = useMemo(
        () => suggestProratedAmount(subscriptions, data.refunded_on),
        [subscriptions, data.refunded_on],
    );

    const showForm = !isRefunded || isEditing;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        post(saveRefund.url(order.id), {
            preserveScroll: true,
            onSuccess: () => {
                setIsEditing(false);
                setData('receipt', null);
                toast.success(
                    isRefunded
                        ? 'Prorated refund updated'
                        : 'Prorated refund recorded',
                );
            },
        });
    };

    const handleCancel = () => {
        reset();
        clearErrors();
        setIsEditing(false);
    };

    const handleRemove = () => {
        router.delete(destroyRefund.url(order.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setData({
                    amount: '',
                    refunded_on: today(),
                    receipt: null,
                    note: '',
                });
                toast.success('Prorated refund removed');
            },
        });
    };

    return (
        <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 flex items-center gap-2 text-xl font-semibold">
                <Undo2 className="size-5 text-muted-foreground" />
                Prorated Refund
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
                {isRefunded
                    ? 'This refund is deducted from the order’s profit and tithe.'
                    : 'Record money handed back for the unused part of this order.'}
            </p>

            {isRefunded && !isEditing && (
                <div className="space-y-4">
                    <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">Amount</dt>
                            <dd className="font-semibold text-danger">
                                −{formatNpr(order.refund_amount ?? 0)}
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground">
                                Refunded on
                            </dt>
                            <dd>{order.refunded_on}</dd>
                        </div>
                    </dl>
                    {order.refund_note && (
                        <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                            {order.refund_note}
                        </p>
                    )}
                    {order.refund_receipt_path && (
                        <div className="overflow-hidden rounded-lg border bg-muted p-2">
                            <LightboxImageLink
                                src={`/storage/${order.refund_receipt_path}`}
                                alt="Refund payment receipt"
                                ariaLabel="View full-size refund receipt"
                                className="w-full"
                                imageClassName="h-auto max-h-60 w-full object-contain transition-opacity hover:opacity-90"
                            />
                        </div>
                    )}
                    <div className="flex gap-2 border-t pt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                        >
                            <Pencil className="mr-1 h-4 w-4" /> Edit
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => setIsRemoveDialogOpen(true)}
                        >
                            <Trash2 className="mr-1 h-4 w-4" /> Remove
                        </Button>
                    </div>
                </div>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="refund_on">Refund date</Label>
                        <Input
                            id="refund_on"
                            type="date"
                            max={today()}
                            value={data.refunded_on}
                            onChange={(e) =>
                                setData('refunded_on', e.target.value)
                            }
                        />
                        <InputError message={errors.refunded_on} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="refund_amount">Amount (Rs.)</Label>
                        <Input
                            id="refund_amount"
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            step="0.01"
                            value={data.amount}
                            onChange={(e) => setData('amount', e.target.value)}
                        />
                        {suggestion && suggestion.amount > 0 && (
                            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                                Prorated: {formatNpr(suggestion.amount)} (
                                {suggestion.unusedDays} of{' '}
                                {suggestion.totalDays} days unused)
                                <button
                                    type="button"
                                    className="font-medium text-primary hover:underline"
                                    onClick={() =>
                                        setData(
                                            'amount',
                                            String(suggestion.amount),
                                        )
                                    }
                                >
                                    Use this
                                </button>
                            </p>
                        )}
                        <InputError message={errors.amount} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="refund_receipt">
                            Payment receipt screenshot
                            {isRefunded && (
                                <span className="font-normal text-muted-foreground">
                                    {' '}
                                    (leave empty to keep the current one)
                                </span>
                            )}
                        </Label>
                        <Input
                            id="refund_receipt"
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                setData('receipt', e.target.files?.[0] ?? null)
                            }
                        />
                        <InputError message={errors.receipt} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="refund_note">
                            Note to customer{' '}
                            <span className="font-normal text-muted-foreground">
                                (optional, shown on their order page)
                            </span>
                        </Label>
                        <Textarea
                            id="refund_note"
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                            placeholder="e.g. Refunded the unused 20 days via eSewa."
                            className="min-h-20"
                        />
                        <InputError message={errors.note} />
                    </div>

                    <div className="flex justify-end gap-2">
                        {isEditing && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            disabled={
                                processing ||
                                !data.amount ||
                                !data.refunded_on ||
                                (!isRefunded && !data.receipt)
                            }
                        >
                            {isRefunded ? 'Save Refund' : 'Record Refund'}
                        </Button>
                    </div>
                </form>
            )}

            {isRemoveDialogOpen && (
                <ConfirmDialog
                    title="Remove this prorated refund?"
                    description={
                        <>
                            Order {order.order_number} will no longer show a
                            refund, and its profit and tithe return to their
                            full amounts. The receipt screenshot is deleted.
                        </>
                    }
                    confirmLabel="Remove Refund"
                    onConfirm={handleRemove}
                    onOpenChange={() => setIsRemoveDialogOpen(false)}
                />
            )}
        </div>
    );
}
