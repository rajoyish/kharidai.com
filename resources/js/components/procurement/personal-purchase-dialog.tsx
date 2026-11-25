import { useForm } from '@inertiajs/react';
import { store as storePurchase } from '@/actions/App/Http/Controllers/Admin/WalletPurchaseController';
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
import { formatCredits } from '@/lib/wallet-credits';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Records something bought from the wallet for the owner's own use. The
 * credits are spent oldest first like any purchase, but no product's cost
 * moves, and since no order is involved no profit or tithe is counted.
 */
export function PersonalPurchaseDialog({
    supplierId,
    supplierName,
    balanceCredits,
    onClose,
}: {
    supplierId: number;
    supplierName: string;
    balanceCredits: string;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({
        is_personal: true,
        description: '',
        quantity: '1',
        unit_cost_credits: '',
        purchased_at: today(),
        reference: '',
        notes: '',
    });

    const creditsNeeded =
        Number(data.unit_cost_credits) *
        Math.max(0, Math.floor(Number(data.quantity)));
    const balanceAfter = Number(balanceCredits) - creditsNeeded;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        post(storePurchase.url(supplierId), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Personal purchase</DialogTitle>
                    <DialogDescription>
                        For your own use. Credits come out of {supplierName},
                        but no profit or tithe is counted.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                    <FormField
                        id="description"
                        label="What you bought"
                        error={errors.description}
                        className="sm:col-span-2"
                    >
                        <Input
                            id="description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            placeholder="e.g. Netflix Premium, 1 month"
                            autoFocus
                        />
                    </FormField>
                    <FormField
                        id="unit_cost_credits"
                        label="Credits each"
                        error={errors.unit_cost_credits}
                    >
                        <Input
                            id="unit_cost_credits"
                            inputMode="decimal"
                            value={data.unit_cost_credits}
                            onChange={(e) =>
                                setData(
                                    'unit_cost_credits',
                                    e.target.value.trim(),
                                )
                            }
                            placeholder="e.g. 2.04"
                        />
                    </FormField>
                    <FormField
                        id="quantity"
                        label="Quantity"
                        error={errors.quantity}
                    >
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={data.quantity}
                            onChange={(e) =>
                                setData('quantity', e.target.value)
                            }
                        />
                    </FormField>
                    <FormField
                        id="purchased_at"
                        label="Date"
                        error={errors.purchased_at}
                    >
                        <Input
                            id="purchased_at"
                            type="date"
                            value={data.purchased_at}
                            onChange={(e) =>
                                setData('purchased_at', e.target.value)
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
                        />
                    </FormField>
                    <FormField
                        id="notes"
                        label="Notes"
                        error={errors.notes}
                        className="sm:col-span-2"
                    >
                        <Textarea
                            id="notes"
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            rows={2}
                        />
                    </FormField>

                    <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/60 p-3 text-sm sm:col-span-2">
                        <div>
                            <dt className="text-xs text-muted-foreground">
                                Credits used
                            </dt>
                            <dd className="font-medium tabular-nums">
                                {creditsNeeded > 0
                                    ? formatCredits(creditsNeeded.toFixed(8))
                                    : '—'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">
                                Left after
                            </dt>
                            <dd
                                className={
                                    balanceAfter < 0
                                        ? 'font-medium text-destructive tabular-nums'
                                        : 'font-medium tabular-nums'
                                }
                            >
                                {creditsNeeded <= 0
                                    ? '—'
                                    : balanceAfter < 0
                                      ? 'Not enough credits'
                                      : formatCredits(balanceAfter.toFixed(8))}
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
                        <Button
                            type="submit"
                            disabled={processing || balanceAfter < 0}
                        >
                            Add purchase
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
