import { useForm } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FloatingContactActions } from '@/components/floating-contact-actions';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    amount_due_now: string;
    balance_due: string;
    payment_option: string | null;
    currency: string;
};

export default function NprPayment({ order }: { order: Order }) {
    const [paymentMethod, setPaymentMethod] = useState<'default' | 'esewa' | 'khalti'>('default');

    const { data, setData, post, processing, errors, progress } = useForm({
        receipt: null as File | null,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!data.receipt) {
            toast.error('Please select a receipt image to upload');

            return;
        }

        post(`/checkout/${order.id}/npr`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <SeoHead title="Complete Payment" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
                <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 shadow-sm">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight">
                            Complete Payment
                        </h1>
                        <p className="mt-2 text-muted-foreground">
                            Order {order.order_number}
                        </p>
                    </div>

                    <div className="flex flex-col items-center justify-center rounded-lg border border-primary/20 bg-primary/5 p-6">
                        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm text-center">
                            <img
                                src={
                                    paymentMethod === 'esewa'
                                        ? '/images/QR-eSewa.jpeg'
                                        : paymentMethod === 'khalti'
                                            ? '/images/QR-Khalti.jpeg'
                                            : '/images/QR-pay.png'
                                }
                                alt={`${paymentMethod} QR Code`}
                                className="mx-auto h-48 w-48 object-contain"
                            />
                            <div className="mt-3 text-sm font-semibold">
                                <div>
                                    {paymentMethod === 'default'
                                        ? 'HUES AND ARRAYS PVT LTD'
                                        : 'RAJESH BUDHATHOKI'}
                                </div>
                                <div className="font-medium text-muted-foreground">Store: Kharidai.com</div>
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold">Scan to Pay</h3>
                        <p className="mt-2 text-2xl font-bold text-primary">
                            Rs. {order.amount_due_now}
                        </p>
                        {Number(order.balance_due) > 0 && (
                            <p className="mt-1 text-center text-sm text-muted-foreground">
                                Pay Rs. {order.amount_due_now} now (shipping).
                                Remaining Rs. {order.balance_due} is collected on
                                delivery.
                            </p>
                        )}
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                            Scan the QR code using your mobile banking app. Please note that payments made via eSewa or Khalti may incur a transaction fee.
                        </p>
                        {paymentMethod !== 'default' && (
                            <p className="mt-2 text-center text-sm text-destructive">
                                Escrow is not supported. Payments will be <span className='font-bold'>refunded</span> if any subscription errors occur.
                            </p>
                        )}
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <Button
                                type="button"
                                variant={paymentMethod === 'default' ? 'default' : 'outline'}
                                onClick={() => setPaymentMethod('default')}
                            >
                                Mobile Banking
                            </Button>
                            <Button
                                type="button"
                                variant={paymentMethod === 'esewa' ? 'default' : 'outline'}
                                onClick={() => setPaymentMethod('esewa')}
                            >
                                eSewa
                            </Button>
                            <Button
                                type="button"
                                variant={paymentMethod === 'khalti' ? 'default' : 'outline'}
                                onClick={() => setPaymentMethod('khalti')}
                            >
                                Khalti
                            </Button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="receipt" className="font-semibold">
                                Upload Payment Receipt
                            </Label>
                            <p className="mb-4 text-sm text-muted-foreground">
                                After successful payment, please upload a
                                screenshot of your payment receipt.
                            </p>
                            <div className="flex items-center gap-4">
                                <Input
                                    id="receipt"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) =>
                                        setData(
                                            'receipt',
                                            e.target.files
                                                ? e.target.files[0]
                                                : null,
                                        )
                                    }
                                    className="cursor-pointer"
                                />
                            </div>
                            {errors.receipt && (
                                <div className="mt-1 text-sm text-destructive">
                                    {errors.receipt}
                                </div>
                            )}
                        </div>

                        {progress && (
                            <div className="h-2.5 w-full rounded-full bg-secondary">
                                <div
                                    className="h-2.5 rounded-full bg-primary"
                                    style={{ width: `${progress.percentage}%` }}
                                ></div>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-fit"
                            size="lg"
                            disabled={processing || !data.receipt}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Submit Receipt
                        </Button>
                    </form>
                </div>
            </div>
            <FloatingContactActions />
        </>
    );
}
