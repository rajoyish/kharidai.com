import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    currency: string;
};

export default function MockPocketsflow({ order }: { order: Order }) {
    const { post, processing } = useForm();

    const handlePayment = () => {
        post(`/checkout/${order.id}/usd-mock`);
    };

    return (
        <>
            <Head title="Pocketsflow Payment - Kharidai" />
            <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
                <div className="relative w-full max-w-md space-y-8 overflow-hidden rounded-xl border bg-card p-8 shadow-sm">
                    {/* Mock Pocketsflow Branding */}
                    <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                            <CreditCard className="h-8 w-8" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-blue-950 dark:text-blue-100">
                            Pocketsflow
                        </h1>
                        <p className="text-sm font-medium text-blue-600/80 dark:text-blue-400">
                            Secure Payment Gateway
                        </p>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/50">
                        <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                            <span>Merchant</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                Kharidai.com
                            </span>
                        </div>
                        <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                            <span>Order Ref</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                {order.order_number}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-700">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Amount Due
                            </span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                ${order.total_amount}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="flex items-center justify-center gap-2 text-center text-sm text-slate-500 dark:text-slate-400">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            This is a secure testing environment
                        </p>

                        <Button
                            onClick={handlePayment}
                            disabled={processing}
                            className="w-full bg-blue-600 text-white hover:bg-blue-700"
                            size="lg"
                        >
                            {processing
                                ? 'Processing...'
                                : 'Simulate Successful Payment'}
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
