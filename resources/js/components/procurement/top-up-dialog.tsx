import { useForm } from '@inertiajs/react';
import {
    store as storeTopUp,
    update as updateTopUp,
} from '@/actions/App/Http/Controllers/Admin/WalletTopUpController';
import { FormField } from '@/components/procurement/form-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatNpr } from '@/lib/currency';
import {
    formatPercent,
    formatRate,
    formatSignedPercent,
} from '@/lib/wallet-credits';

export type TopUp = {
    id: number;
    reference: string | null;
    face_value: string;
    amount_paid: string;
    paid_currency: string;
    fx_rate: string;
    cost_npr: number;
    credits_received: string;
    credits_remaining: string;
    npr_per_credit: number;
    voucher_markup_percent: number | null;
    credit_yield_percent: number | null;
    topped_up_at: string;
    notes: string | null;
    is_untouched: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Records or corrects a top-up. The NPR cost and the effective rate per
 * credit are previewed live, since that rate is what every later price is
 * built on. Once purchases have drawn on a top-up only its reference, date
 * and notes stay editable.
 */
export function TopUpDialog({
    supplierId,
    voucherCurrency,
    topUp,
    onClose,
}: {
    supplierId: number;
    voucherCurrency: string;
    topUp: TopUp | null;
    onClose: () => void;
}) {
    const amountsLocked = topUp !== null && !topUp.is_untouched;

    const { data, setData, post, patch, processing, errors } = useForm({
        reference: topUp?.reference ?? '',
        face_value: topUp ? String(Number(topUp.face_value)) : '',
        amount_paid: topUp ? String(Number(topUp.amount_paid)) : '',
        paid_currency: topUp?.paid_currency ?? voucherCurrency,
        fx_rate: topUp ? String(Number(topUp.fx_rate)) : '',
        credits_received: topUp
            ? topUp.credits_received.replace(/\.?0+$/, '')
            : '',
        topped_up_at: topUp?.topped_up_at ?? today(),
        notes: topUp?.notes ?? '',
    });

    const isPaidInNpr = data.paid_currency.toUpperCase() === 'NPR';
    const fxRate = isPaidInNpr ? 1 : Number(data.fx_rate);
    const costNpr = Number(data.amount_paid) * fxRate;
    const credits = Number(data.credits_received);
    const nprPerCredit = credits > 0 && costNpr > 0 ? costNpr / credits : null;
    const faceValue = Number(data.face_value);
    const markup =
        data.paid_currency.toUpperCase() === voucherCurrency.toUpperCase() &&
        faceValue > 0 &&
        Number(data.amount_paid) > 0
            ? ((Number(data.amount_paid) - faceValue) / faceValue) * 100
            : null;
    const creditYield =
        faceValue > 0 && credits > 0 ? (credits / faceValue) * 100 : null;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: onClose };

        if (topUp) {
            patch(
                updateTopUp.url({ supplier: supplierId, topUp: topUp.id }),
                options,
            );
        } else {
            post(storeTopUp.url(supplierId), options);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {topUp ? 'Edit top-up' : 'Add top-up'}
                    </DialogTitle>
                    <DialogDescription>
                        {amountsLocked
                            ? 'Some credits are already used, so amounts can’t be changed.'
                            : 'What you paid, and the credits you got.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        id="face_value"
                        label={`Voucher value (${voucherCurrency})`}
                        error={errors.face_value}
                    >
                        <Input
                            id="face_value"
                            type="number"
                            step="0.0001"
                            min="0"
                            value={data.face_value}
                            disabled={amountsLocked}
                            onChange={(e) =>
                                setData('face_value', e.target.value)
                            }
                            placeholder="e.g. 10.00"
                        />
                    </FormField>
                    <FormField
                        id="credits_received"
                        label="Credits received"
                        hint="As shown by the supplier."
                        error={errors.credits_received}
                    >
                        <Input
                            id="credits_received"
                            inputMode="decimal"
                            value={data.credits_received}
                            disabled={amountsLocked}
                            onChange={(e) =>
                                setData(
                                    'credits_received',
                                    e.target.value.trim(),
                                )
                            }
                            placeholder="e.g. 8.09676294"
                        />
                    </FormField>
                    <FormField
                        id="amount_paid"
                        label="You paid"
                        error={errors.amount_paid}
                    >
                        <div className="flex gap-2">
                            <Input
                                id="amount_paid"
                                type="number"
                                step="0.0001"
                                min="0"
                                value={data.amount_paid}
                                disabled={amountsLocked}
                                onChange={(e) =>
                                    setData('amount_paid', e.target.value)
                                }
                                placeholder="e.g. 12.05"
                            />
                            <Input
                                aria-label="Paid currency"
                                className="w-20 uppercase"
                                maxLength={3}
                                value={data.paid_currency}
                                disabled={amountsLocked}
                                onChange={(e) =>
                                    setData(
                                        'paid_currency',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                            />
                        </div>
                        {errors.paid_currency && (
                            <div className="text-sm text-destructive">
                                {errors.paid_currency}
                            </div>
                        )}
                    </FormField>
                    <FormField
                        id="fx_rate"
                        label={`Rs. per ${isPaidInNpr ? 'NPR' : data.paid_currency || 'unit'}`}
                        hint={
                            isPaidInNpr
                                ? 'Paid in rupees.'
                                : 'The rate you paid, with card fees.'
                        }
                        error={errors.fx_rate}
                    >
                        <Input
                            id="fx_rate"
                            type="number"
                            step="0.000001"
                            min="0"
                            value={isPaidInNpr ? '1' : data.fx_rate}
                            disabled={amountsLocked || isPaidInNpr}
                            onChange={(e) => setData('fx_rate', e.target.value)}
                            placeholder="e.g. 131.42"
                        />
                    </FormField>
                    <FormField
                        id="topped_up_at"
                        label="Date"
                        error={errors.topped_up_at}
                    >
                        <Input
                            id="topped_up_at"
                            type="date"
                            value={data.topped_up_at}
                            onChange={(e) =>
                                setData('topped_up_at', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        id="reference"
                        label="Reference"
                        error={errors.reference}
                    >
                        <Input
                            id="reference"
                            value={data.reference}
                            onChange={(e) =>
                                setData('reference', e.target.value)
                            }
                            placeholder="e.g. GC-1023"
                        />
                    </FormField>
                    <FormField
                        id="notes"
                        label="Notes"
                        error={errors.notes}
                        className="grid gap-2 sm:col-span-2"
                    >
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                        />
                    </FormField>

                    <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/60 p-3 text-sm sm:col-span-2 sm:grid-cols-4">
                        <div>
                            <dt className="text-xs text-muted-foreground">
                                Total in Rs.
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {costNpr > 0 ? formatNpr(costNpr) : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">
                                1 credit costs
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {formatRate(nprPerCredit)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">
                                Paid over value
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {markup === null
                                    ? '—'
                                    : formatSignedPercent(markup)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">
                                Credits vs value
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {formatPercent(creditYield)}
                            </dd>
                        </div>
                    </dl>

                    <DialogFooter className="sm:col-span-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {topUp ? 'Save' : 'Add top-up'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
