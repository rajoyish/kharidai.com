import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { PagePanel } from '@/components/page-panel';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    currency: string;
    status: string;
    created_at: string;
    items: {
        id: number;
        quantity: number;
        product_variant: {
            name: string;
            product: {
                title: string;
                image: string;
            };
        };
    }[];
    credentials: {
        id: number;
        content: string;
        created_at: string;
    }[];
    messages: {
        id: number;
        message: string;
        created_at: string;
        user: {
            name: string;
            is_admin: boolean;
        };
    }[];
    payment_receipt: {
        id: number;
        status: string;
        file_path: string;
    } | null;
};

export default function OrderShow({ order }: { order: Order }) {
    const { auth } = usePage().props;
    const { data, setData, post, processing, reset } = useForm({
        message: '',
    });

    const breadcrumbs: Breadcrumbs = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'My Orders', href: '/orders' },
        { title: order.order_number, href: `/orders/${order.id}` },
    ];

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/orders/${order.id}/messages`, {
            preserveScroll: true,
            onSuccess: () => reset('message'),
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Order ${order.order_number}`} />

            <PagePanel
                title={`Order ${order.order_number}`}
                description={`Placed on ${new Date(order.created_at).toLocaleString()}`}
                actions={
                    <span
                        className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
                            order.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : order.status === 'delivering'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                    >
                        {order.status}
                    </span>
                }
                variant="transparent"
            >

                {order.payment_receipt &&
                    order.payment_receipt.status === 'pending' && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                            Your payment receipt is currently being reviewed.
                            Once approved, we will process your order.
                        </div>
                    )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {/* Order Items */}
                        <div className="rounded-xl border bg-card p-6">
                            <h2 className="mb-4 text-xl font-semibold">
                                Items
                            </h2>
                            <div className="divide-y">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 py-4"
                                    >
                                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                                            {item.product_variant.product
                                                .image && (
                                                <img
                                                    src={`/storage/${item.product_variant.product.image}`}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">
                                                {
                                                    item.product_variant.product
                                                        .title
                                                }
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                {item.product_variant.name}
                                            </p>
                                            <p className="mt-1 text-sm font-medium">
                                                Qty: {item.quantity}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Digital Delivery Credentials */}
                        <div className="rounded-xl border bg-card p-6">
                            <h2 className="mb-4 text-xl font-semibold">
                                Digital Delivery
                            </h2>
                            {order.credentials.length > 0 ? (
                                <div className="space-y-4">
                                    {order.credentials.map((cred) => {
                                        const parts = cred.content.split('```');
                                        
                                        return (
                                            <div
                                                key={cred.id}
                                                className="rounded-lg border bg-card p-5 shadow-sm"
                                            >
                                                <div className="space-y-4">
                                                    {parts.map((part, i) => {
                                                        const isCodeBlock = i % 2 === 1;
                                                        if (!part.trim()) return null;

                                                        if (isCodeBlock) {
                                                            let codeText = part.trim();
                                                            if (codeText.startsWith('link\n')) {
                                                                codeText = codeText.substring(5).trim();
                                                            }
                                                            
                                                            return (
                                                                <div key={i} className="relative rounded-md bg-muted/80 p-4 font-mono text-sm border">
                                                                    <pre className="overflow-x-auto whitespace-pre-wrap pr-10">{codeText}</pre>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => copyToClipboard(codeText)}
                                                                        className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                        title="Copy to clipboard"
                                                                    >
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        }

                                                        const urlRegex = /(https?:\/\/[^\s]+)/g;
                                                        const textParts = part.split(urlRegex);

                                                        return (
                                                            <div key={i} className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                                                {textParts.map((tPart, j) => {
                                                                    if (tPart.match(urlRegex)) {
                                                                        return (
                                                                            <a
                                                                                key={j}
                                                                                href={tPart}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-primary font-medium hover:underline"
                                                                            >
                                                                                {tPart}
                                                                            </a>
                                                                        );
                                                                    }
                                                                    return <span key={j}>{tPart}</span>;
                                                                })}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed bg-muted/30 py-8 text-center text-muted-foreground">
                                    {order.status === 'pending' ||
                                    order.status === 'delivering'
                                        ? 'Your digital items will appear here once delivered.'
                                        : 'No digital items attached to this order.'}
                                </div>
                            )}
                        </div>

                        {/* Order Messages */}
                        <div className="flex h-[500px] flex-col rounded-xl border bg-card p-6">
                            <h2 className="mb-4 flex-shrink-0 text-xl font-semibold">
                                Support & Updates
                            </h2>
                            <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2">
                                {order.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col ${msg.user.is_admin ? 'items-start' : 'items-end'}`}
                                    >
                                        <span className="mx-1 mb-1 text-xs text-muted-foreground">
                                            {msg.user.is_admin
                                                ? 'Support Admin'
                                                : 'You'}{' '}
                                            -{' '}
                                            {new Date(
                                                msg.created_at,
                                            ).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                        <div
                                            className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                                msg.user.is_admin
                                                    ? 'rounded-tl-sm bg-secondary text-secondary-foreground'
                                                    : 'rounded-tr-sm bg-primary text-primary-foreground'
                                            }`}
                                        >
                                            {msg.message}
                                        </div>
                                    </div>
                                ))}
                                {order.messages.length === 0 && (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        No messages yet. Feel free to ask a
                                        question.
                                    </div>
                                )}
                            </div>
                            <form
                                onSubmit={handleSendMessage}
                                className="mt-auto flex flex-shrink-0 gap-2 border-t pt-2"
                            >
                                <Textarea
                                    value={data.message}
                                    onChange={(e) =>
                                        setData('message', e.target.value)
                                    }
                                    placeholder="Type your message..."
                                    className="min-h-[60px] resize-none"
                                />
                                <Button
                                    type="submit"
                                    disabled={
                                        processing || !data.message.trim()
                                    }
                                    className="h-auto"
                                >
                                    Send
                                </Button>
                            </form>
                        </div>
                    </div>

                    <div>
                        <div className="sticky top-6 rounded-xl border bg-card p-6">
                            <h3 className="mb-4 text-lg font-semibold">
                                Summary
                            </h3>
                            <div className="flex items-center justify-between border-b py-2">
                                <span className="text-muted-foreground">
                                    Currency
                                </span>
                                <span className="font-medium uppercase">
                                    {order.currency}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-b py-2">
                                <span className="text-muted-foreground">
                                    Total
                                </span>
                                <span className="text-lg font-bold">
                                    {order.currency === 'npr' ? 'Rs.' : '$'}{' '}
                                    {order.total_amount}
                                </span>
                            </div>
                        </div>

                        {order.payment_receipt && (
                            <div className="mt-6 rounded-xl border bg-card p-6">
                                <h3 className="mb-4 text-lg font-semibold">
                                    Payment Receipt
                                </h3>
                                <div className="overflow-hidden rounded-lg border bg-muted p-2">
                                    <a
                                        href={`/storage/${order.payment_receipt.file_path}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <img
                                            src={`/storage/${order.payment_receipt.file_path}`}
                                            alt="Payment Receipt"
                                            className="h-auto max-h-60 w-full object-contain"
                                        />
                                    </a>
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Status:
                                    </span>
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                            order.payment_receipt.status === 'approved'
                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
                                                : order.payment_receipt.status === 'rejected'
                                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                        }`}
                                    >
                                        {order.payment_receipt.status}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PagePanel>
        </AppLayout>
    );
}
