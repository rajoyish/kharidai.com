import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Upload } from 'lucide-react';
import { toast } from 'sonner';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    currency: string;
};

export default function NprPayment({ order }: { order: Order }) {
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
            <Head title="Complete Payment - Kharidai" />
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
                        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
                            <QrCode className="h-32 w-32 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold">Scan to Pay</h3>
                        <p className="mt-2 text-2xl font-bold text-primary">
                            Rs. {order.total_amount}
                        </p>
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                            Scan the QR code above using eSewa, Khalti, or your
                            Mobile Banking app to complete the payment.
                        </p>
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
                            className="w-full"
                            size="lg"
                            disabled={processing || !data.receipt}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Submit Receipt
                        </Button>
                    </form>
                </div>
            </div>
        </>
    );
}
