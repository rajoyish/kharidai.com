import { CheckCircle2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const rupees = (value: number) => `Rs. ${value.toFixed(0)}`;

export function PaymentOptionToggle({
    data,
    setData,
    errors,
    isPhysicalOnly,
    itemsTotal,
    shippingTotal,
}: {
    data: { payment_option: string };
    setData: (field: string, value: string) => void;
    errors: Partial<Record<string, string>>;
    isPhysicalOnly: boolean;
    itemsTotal: number;
    shippingTotal: number;
}) {
    return (
        <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Payment</h2>

            <div className="mb-4 flex items-start justify-between rounded-md border-2 border-primary bg-primary/5 p-4">
                <Label className="flex-1 cursor-default font-medium">
                    Pay via QR (NPR)
                    <p className="mt-1 text-sm font-normal text-muted-foreground">
                        Manual payment via local bank/wallet transfer.
                    </p>
                </Label>
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
            </div>

            {isPhysicalOnly && (
                <RadioGroup
                    value={data.payment_option}
                    onValueChange={(value) => setData('payment_option', value)}
                    className="gap-3"
                >
                    <Label
                        htmlFor="pay_full"
                        className="flex items-start gap-3 rounded-md border p-4"
                    >
                        <RadioGroupItem value="full" id="pay_full" />
                        <span>
                            Pay full amount now
                            <span className="mt-1 block text-sm font-normal text-muted-foreground">
                                Settle goods and shipping in one payment.
                            </span>
                        </span>
                    </Label>
                    <Label
                        htmlFor="pay_shipping"
                        className="flex items-start gap-3 rounded-md border p-4"
                    >
                        <RadioGroupItem value="shipping_only" id="pay_shipping" />
                        <span>
                            Pay shipping only
                            <span className="mt-1 block text-sm font-normal text-muted-foreground">
                                Pay {rupees(shippingTotal)} now, the rest ({rupees(itemsTotal)}) on
                                delivery.
                            </span>
                        </span>
                    </Label>
                </RadioGroup>
            )}
            {errors.payment_option && (
                <p className="mt-2 text-sm text-destructive">{errors.payment_option}</p>
            )}
        </div>
    );
}
