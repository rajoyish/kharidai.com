import { router } from '@inertiajs/react';
import { Copy, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { toast } from 'sonner';

import { processNprPayment } from '@/actions/App/Http/Controllers/CheckoutController';
import {
    askForReceiptReupload,
    storeMessage,
} from '@/actions/App/Http/Controllers/User/OrderController';
import { agreeInvoice } from '@/actions/App/Http/Controllers/User/ServiceController';
import { CopyButton } from '@/components/copy-button';
import { LightboxImageLink } from '@/components/lightbox-image-link';
import { PagePanel } from '@/components/page-panel';
import { PaymentQrPanel } from '@/components/payment-qr-panel';
import { SeoHead } from '@/components/seo-head';
import { ServiceInvoiceCard } from '@/components/service-invoice-card';
import type { ServiceInvoice } from '@/components/service-invoice-card';
import {
    ApprovalStatusBadge,
    OrderStatusBadge,
} from '@/components/status-badge';
import { SupportChat } from '@/components/SupportChat';
import { Button } from '@/components/ui/button';
import { VariantOptionBadges } from '@/components/variant-option-badges';
import type { SelectedOptions } from '@/components/variant-option-badges';
import { formatNpr } from '@/lib/currency';

type Order = {
    id: number;
    order_number: string;
    /** Invoice-aware total: service invoices supersede checkout estimates. */
    display_total_npr: number;
    currency: string;
    amount_due_now: number;
    balance_due: number;
    status: string;
    created_at: string;
    can_reupload_receipt: boolean;
    request_receipt_upload: boolean;
    items: {
        id: number;
        quantity: number;
        selected_options: SelectedOptions;
        brief: { note?: string } | null;
        service_invoices: ServiceInvoice[];
        product_variant: {
            name: string;
            weight_kg: string | null;
            product: {
                title: string;
                image: string;
                type: 'physical' | 'digital' | 'service';
            };
        };
    }[];
    shipment: {
        status: string;
        tracking_note: string | null;
    } | null;
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
    // Chat component handles messages

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    // Engagements are listed before they are billed, so only the ones with a
    // saved invoice count towards the "outstanding invoices" banner.
    const unpaidInvoicesTotal = order.items.reduce(
        (total, item) =>
            total +
            item.service_invoices
                .filter((invoice) => invoice.line_items.length > 0)
                .reduce((sum, invoice) => sum + invoice.due_npr, 0),
        0,
    );

    // Invoices the customer has agreed to and now owes payment on. These are
    // what the QR payment panel collects for.
    const awaitingPaymentDue = order.items.reduce(
        (total, item) =>
            total +
            item.service_invoices
                .filter((invoice) => invoice.status === 'awaiting_payment')
                .reduce((sum, invoice) => sum + invoice.due_npr, 0),
        0,
    );

    // Mirrors the checkout QR page: an outstanding invoice supersedes the
    // checkout-time figures and is settled in full, so nothing is left on
    // delivery.
    const qrAmountDue =
        unpaidInvoicesTotal > 0 ? unpaidInvoicesTotal : order.amount_due_now;
    const qrBalanceDue = unpaidInvoicesTotal > 0 ? 0 : order.balance_due;

    // The scan-to-pay QR sits above the receipt block only while payment is
    // still owed. Once a receipt is uploaded there is nothing left to scan, and
    // an agreed service invoice already carries its own QR panel above.
    const showPaymentQr =
        !order.payment_receipt &&
        awaitingPaymentDue <= 0 &&
        (order.status === 'pending' || unpaidInvoicesTotal > 0);

    const [agreeingInvoiceId, setAgreeingInvoiceId] = useState<number | null>(
        null,
    );

    // Accepting the invoice moves the engagement to "Awaiting payment", which
    // opens the QR payment and receipt upload step below.
    const agreeToInvoice = (invoiceId: number) => {
        setAgreeingInvoiceId(invoiceId);
        router.post(
            agreeInvoice.url({ serviceEngagement: invoiceId }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setAgreeingInvoiceId(null),
            },
        );
    };

    const canAgreeToInvoice = (invoice: ServiceInvoice) =>
        (invoice.status === 'negotiation' ||
            invoice.status === 'final_billing') &&
        invoice.line_items.length > 0 &&
        invoice.due_npr > 0;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            router.post(
                processNprPayment.url(order.id),
                { receipt: e.target.files[0] },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        toast.success('Receipt uploaded successfully');
                    },
                    onFinish: () => {
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                    },
                },
            );
        }
    };

    return (
        <>
            <SeoHead title={`Order ${order.order_number}`} />

            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleReceiptUpload}
            />

            <PagePanel
                title={
                    <h1 className="flex items-center gap-1 text-2xl font-bold tracking-tight">
                        Order {order.order_number}
                        <CopyButton
                            value={order.order_number}
                            label="order number"
                        />
                    </h1>
                }
                description={`Placed on ${new Date(order.created_at).toLocaleString()}`}
                actions={
                    <div className="flex items-center gap-3">
                        <OrderStatusBadge
                            status={order.status}
                            className="px-4 py-1.5 text-sm"
                        />
                        {order.shipment && (
                            <OrderStatusBadge
                                status={order.shipment.status}
                                label={`Shipment: ${order.shipment.status}`}
                                className="px-4 py-1.5 text-sm"
                            />
                        )}
                    </div>
                }
                variant="transparent"
            >
                {order.payment_receipt &&
                    order.payment_receipt.status === 'pending' && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                            Your payment receipt is currently being reviewed.
                            Once approved, we will process your order.
                        </div>
                    )}
                {unpaidInvoicesTotal > 0 && (
                    <div className="mb-6 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                        <div>
                            <strong>Action Required:</strong> You have
                            outstanding invoices totaling{' '}
                            {formatNpr(unpaidInvoicesTotal)}.
                        </div>
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
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
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
                                            <VariantOptionBadges
                                                selectedOptions={
                                                    item.selected_options
                                                }
                                                weightKg={
                                                    item.product_variant
                                                        .weight_kg
                                                }
                                                className="mt-1"
                                            />
                                            <p className="mt-1 text-sm font-medium">
                                                Qty: {item.quantity}
                                            </p>
                                            {item.brief?.note && (
                                                <div className="mt-2 rounded-md border border-dashed bg-muted/40 p-3">
                                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                                        Service Requirements
                                                    </p>
                                                    <p className="mt-1 text-sm whitespace-pre-line">
                                                        {item.brief.note}
                                                    </p>
                                                </div>
                                            )}
                                            {item.service_invoices.map(
                                                (invoice) => (
                                                    <div key={invoice.id}>
                                                        <ServiceInvoiceCard
                                                            invoice={invoice}
                                                        />
                                                        {canAgreeToInvoice(
                                                            invoice,
                                                        ) && (
                                                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                                                                <p className="text-sm text-muted-foreground">
                                                                    Happy with
                                                                    this
                                                                    invoice?
                                                                    Agree to it
                                                                    to proceed
                                                                    with
                                                                    payment.
                                                                </p>
                                                                <Button
                                                                    size="sm"
                                                                    disabled={
                                                                        agreeingInvoiceId ===
                                                                        invoice.id
                                                                    }
                                                                    onClick={() =>
                                                                        agreeToInvoice(
                                                                            invoice.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                                                    Agree &
                                                                    Proceed to
                                                                    Payment
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {invoice.status ===
                                                            'awaiting_payment' &&
                                                            invoice.due_npr >
                                                                0 && (
                                                                <p className="mt-2 rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
                                                                    Invoice
                                                                    agreed. Scan
                                                                    the QR code
                                                                    in the
                                                                    payment
                                                                    panel and
                                                                    upload your
                                                                    receipt to
                                                                    settle{' '}
                                                                    {formatNpr(
                                                                        invoice.due_npr,
                                                                    )}
                                                                    .
                                                                </p>
                                                            )}
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Digital Delivery Credentials */}
                        {order.items.some(
                            (item) =>
                                item.product_variant.product.type === 'digital',
                        ) && (
                            <div className="rounded-xl border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Digital Delivery
                                </h2>
                                {order.credentials.length > 0 ? (
                                    <div className="space-y-4">
                                        {order.credentials.map((cred) => {
                                            const parts =
                                                cred.content.split('```');

                                            return (
                                                <div
                                                    key={cred.id}
                                                    className="rounded-lg border bg-card p-5 shadow-sm"
                                                >
                                                    <div className="space-y-4">
                                                        {parts.map(
                                                            (part, i) => {
                                                                const isCodeBlock =
                                                                    i % 2 === 1;

                                                                if (
                                                                    !part.trim()
                                                                ) {
                                                                    return null;
                                                                }

                                                                if (
                                                                    isCodeBlock
                                                                ) {
                                                                    let codeText =
                                                                        part.trim();

                                                                    if (
                                                                        codeText.startsWith(
                                                                            'link\n',
                                                                        )
                                                                    ) {
                                                                        codeText =
                                                                            codeText
                                                                                .substring(
                                                                                    5,
                                                                                )
                                                                                .trim();
                                                                    }

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                i
                                                                            }
                                                                            className="relative rounded-md border bg-muted/80 p-4 font-mono text-sm"
                                                                        >
                                                                            <pre className="overflow-x-auto pr-10 whitespace-pre-wrap">
                                                                                {
                                                                                    codeText
                                                                                }
                                                                            </pre>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() =>
                                                                                    copyToClipboard(
                                                                                        codeText,
                                                                                    )
                                                                                }
                                                                                className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                                title="Copy to clipboard"
                                                                            >
                                                                                <Copy className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    );
                                                                }

                                                                const urlRegex =
                                                                    /(https?:\/\/[^\s]+)/g;
                                                                const textParts =
                                                                    part.split(
                                                                        urlRegex,
                                                                    );

                                                                return (
                                                                    <div
                                                                        key={i}
                                                                        className="text-sm leading-relaxed whitespace-pre-wrap text-foreground"
                                                                    >
                                                                        {textParts.map(
                                                                            (
                                                                                tPart,
                                                                                j,
                                                                            ) => {
                                                                                if (
                                                                                    tPart.match(
                                                                                        urlRegex,
                                                                                    )
                                                                                ) {
                                                                                    return (
                                                                                        <a
                                                                                            key={
                                                                                                j
                                                                                            }
                                                                                            href={
                                                                                                tPart
                                                                                            }
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="font-medium text-primary hover:underline"
                                                                                        >
                                                                                            {
                                                                                                tPart
                                                                                            }
                                                                                        </a>
                                                                                    );
                                                                                }

                                                                                return (
                                                                                    <span
                                                                                        key={
                                                                                            j
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            tPart
                                                                                        }
                                                                                    </span>
                                                                                );
                                                                            },
                                                                        )}
                                                                    </div>
                                                                );
                                                            },
                                                        )}
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
                        )}

                        {/* Order Messages */}
                        <SupportChat
                            order={order}
                            postUrl={storeMessage.url(order.id)}
                        />
                    </div>

                    <div className="space-y-6 lg:sticky lg:top-6">
                        {awaitingPaymentDue > 0 &&
                            order.payment_receipt?.status !== 'pending' && (
                                <div className="rounded-xl border bg-card p-6">
                                    <h3 className="mb-4 text-lg font-semibold">
                                        Pay for Services
                                    </h3>
                                    <PaymentQrPanel
                                        amountLabel={formatNpr(
                                            awaitingPaymentDue,
                                        )}
                                    />
                                    <div className="mt-4 border-t pt-4">
                                        <p className="mb-3 text-sm text-muted-foreground">
                                            After paying, upload a screenshot of
                                            your payment receipt so we can
                                            verify it.
                                        </p>
                                        <Button
                                            className="w-fit"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload Payment Receipt
                                        </Button>
                                    </div>
                                </div>
                            )}

                        {order.display_total_npr > 0 && (
                            <div className="rounded-xl border bg-card p-6">
                                <h3 className="mb-4 text-lg font-semibold">
                                    Summary
                                </h3>

                                <div className="flex items-center justify-between border-b py-2">
                                    <span className="text-muted-foreground">
                                        Total
                                    </span>
                                    <span className="text-lg font-bold">
                                        {formatNpr(order.display_total_npr)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {order.payment_receipt && (
                            <div className="mt-6 rounded-xl border bg-card p-6">
                                <h3 className="mb-4 text-lg font-semibold">
                                    Payment Receipt
                                </h3>
                                <div className="overflow-hidden rounded-lg border bg-muted p-2">
                                    <LightboxImageLink
                                        src={`/storage/${order.payment_receipt.file_path}`}
                                        alt="Payment Receipt"
                                        ariaLabel="View full-size payment receipt"
                                        className="w-full"
                                        imageClassName="h-auto max-h-60 w-full object-contain transition-opacity hover:opacity-90"
                                    />
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Status:
                                    </span>
                                    <ApprovalStatusBadge
                                        status={order.payment_receipt.status}
                                    />
                                </div>
                                {unpaidInvoicesTotal > 0 ? (
                                    <div className="mt-4 border-t pt-4">
                                        <div className="mb-3 text-sm font-medium text-amber-700 dark:text-amber-400">
                                            You have outstanding invoices
                                            totaling{' '}
                                            {formatNpr(unpaidInvoicesTotal)}.
                                        </div>
                                        {order.payment_receipt.status ===
                                        'pending' ? (
                                            <Button className="w-fit" disabled>
                                                <Upload className="mr-2 h-4 w-4" />{' '}
                                                Pay Due Amount (Upload Receipt)
                                            </Button>
                                        ) : (
                                            <Button
                                                className="w-fit"
                                                onClick={() =>
                                                    fileInputRef.current?.click()
                                                }
                                            >
                                                <Upload className="mr-2 h-4 w-4" />{' '}
                                                Pay Due Amount (Upload Receipt)
                                            </Button>
                                        )}
                                    </div>
                                ) : order.can_reupload_receipt ? (
                                    <div className="mt-4 border-t pt-4">
                                        <Button
                                            className="w-fit"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                        >
                                            <Upload className="mr-2 h-4 w-4" />{' '}
                                            Re-upload Receipt
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="mt-4 border-t pt-4">
                                        <Button
                                            className="w-fit"
                                            variant="outline"
                                            disabled={
                                                order.request_receipt_upload
                                            }
                                            onClick={() => {
                                                router.post(
                                                    askForReceiptReupload.url(
                                                        order.id,
                                                    ),
                                                    {},
                                                    { preserveScroll: true },
                                                );
                                            }}
                                        >
                                            <AlertCircle className="mr-2 h-4 w-4" />
                                            {order.request_receipt_upload
                                                ? 'Re-upload Requested'
                                                : 'Ask Admin to Re-upload'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {showPaymentQr && (
                            <div className="mt-6 rounded-xl border bg-card p-6">
                                <PaymentQrPanel
                                    amountLabel={formatNpr(qrAmountDue)}
                                >
                                    {qrBalanceDue > 0 && (
                                        <p className="mt-1 text-center text-sm text-muted-foreground">
                                            Pay {formatNpr(qrAmountDue)} now
                                            (shipping). Remaining{' '}
                                            {formatNpr(qrBalanceDue)} is
                                            collected on delivery.
                                        </p>
                                    )}
                                </PaymentQrPanel>
                            </div>
                        )}

                        {!order.payment_receipt &&
                        (order.status === 'pending' ||
                            unpaidInvoicesTotal > 0) ? (
                            <div className="mt-6 rounded-xl border bg-card p-6">
                                <h3 className="mb-4 text-lg font-semibold">
                                    {unpaidInvoicesTotal > 0
                                        ? 'Pay Invoice Due'
                                        : 'Payment Receipt'}
                                </h3>
                                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                                    {unpaidInvoicesTotal > 0
                                        ? `You have an outstanding invoice amount of ${formatNpr(unpaidInvoicesTotal)}. Please upload your payment receipt to settle the balance.`
                                        : `No receipt uploaded yet. Please upload your payment receipt to process the order.`}
                                </div>
                                <div className="mt-4 border-t pt-4">
                                    <Button
                                        className="w-fit"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        <Upload className="mr-2 h-4 w-4" />{' '}
                                        {unpaidInvoicesTotal > 0
                                            ? 'Pay Due Amount'
                                            : 'Upload Receipt'}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </PagePanel>
        </>
    );
}

OrderShow.layout = {
    breadcrumbs: [
        { title: 'Home', href: '/' },
        { title: 'My Orders', href: '/orders' },
        { title: 'Order Details', href: '#' },
    ],
};
