import { useForm, router } from '@inertiajs/react';
import { Check, Pencil, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    allowReceiptReupload,
    destroy as destroyOrder,
    destroyCredential,
    markBalancePaid,
    storeCredential,
    storeMessage,
    updateCredential,
    updateReceiptStatus,
    updateShipmentStatus,
    updateStatus as updateOrderStatus,
} from '@/actions/App/Http/Controllers/Admin/OrderController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CopyButton } from '@/components/copy-button';
import { LightboxImageLink } from '@/components/lightbox-image-link';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { ServiceInvoiceCard } from '@/components/service-invoice-card';
import type { ServiceInvoice } from '@/components/service-invoice-card';
import { SupportChat } from '@/components/SupportChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VariantOptionBadges } from '@/components/variant-option-badges';
import type { SelectedOptions } from '@/components/variant-option-badges';
import { formatNpr } from '@/lib/currency';
import { dashboard } from '@/routes/admin';
import { index as adminOrdersIndex } from '@/routes/admin/orders';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    items_total: string;
    shipping_total: string;
    amount_due_now: string;
    balance_due: string;
    payment_option: string | null;
    status: string;
    created_at: string;
    can_reupload_receipt: boolean;
    request_receipt_upload: boolean;
    additional_data: { note?: string } | null;
    shipment: {
        id: number;
        status: string;
        recipient_name: string;
        mobile_number: string;
        address_line: string;
        city: string;
        landmark: string | null;
        zone_name: string | null;
        tracking_note: string | null;
    } | null;
    user: {
        id: number;
        name: string;
        email: string;
    };
    items: {
        id: number;
        quantity: number;
        price: string;
        purchase_price: string;
        selected_options: SelectedOptions;
        brief: { note?: string } | null;
        product_variant: {
            name: string;
            validity_days: number | null;
            weight_kg: string | null;
            product: {
                title: string;
                image: string;
                type: 'physical' | 'digital' | 'service';
            };
        };
        service_invoices: ServiceInvoice[];
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
    subscriptions: {
        id: number;
        start_date: string;
        end_date: string | null;
        days_left: number | null;
        order_item: {
            id: number;
            quantity: number;
            product_variant: {
                name: string;
                product: {
                    title: string;
                };
            };
        } | null;
    }[];
};

export default function AdminOrderShow({
    order,
    shipmentStatuses,
}: {
    order: Order;
    shipmentStatuses: string[];
}) {
    const {
        data: statusData,
        setData: setStatusData,
        patch: patchStatus,
        processing: processingStatus,
    } = useForm({
        status: order.status,
    });

    // Receipt status is handled via router.patch now

    const {
        data: credData,
        setData: setCredData,
        post: postCred,
        processing: processingCred,
        reset: resetCred,
    } = useForm({
        content: '',
    });

    // Chat handled by SupportChat component

    const handleUpdateStatus = (e: React.FormEvent) => {
        e.preventDefault();
        patchStatus(updateOrderStatus.url(order), {
            preserveScroll: true,
            onSuccess: () => toast.success('Order status updated'),
        });
    };

    const [processingReceipt, setProcessingReceipt] = useState(false);

    const handleReceiptAction = (status: 'approved' | 'rejected') => {
        if (!order.payment_receipt) {
            return;
        }

        router.patch(
            updateReceiptStatus(order.payment_receipt),
            { status },
            {
                preserveScroll: true,
                onStart: () => setProcessingReceipt(true),
                onFinish: () => setProcessingReceipt(false),
                onSuccess: () => toast.success(`Receipt ${status}`),
            },
        );
    };

    const [editingCredentialId, setEditingCredentialId] = useState<
        number | null
    >(null);
    const [editCredContent, setEditCredContent] = useState('');

    const handleEditCredentialSubmit = (e: React.FormEvent, credId: number) => {
        e.preventDefault();
        router.put(
            updateCredential({ order, credential: credId }),
            { content: editCredContent },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingCredentialId(null);
                    toast.success('Credential updated');
                },
            },
        );
    };

    /** The credential id awaiting delete confirmation. */
    const [credentialToDelete, setCredentialToDelete] = useState<number | null>(
        null,
    );

    const handleDeleteCredential = (credId: number) => {
        router.delete(destroyCredential({ order, credential: credId }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Credential deleted'),
        });
    };

    const handleAddCredential = (e: React.FormEvent) => {
        e.preventDefault();
        postCred(storeCredential.url(order), {
            preserveScroll: true,
            onSuccess: () => resetCred('content'),
        });
    };

    const [deletingOrder, setDeletingOrder] = useState(false);
    const [isDeleteOrderDialogOpen, setIsDeleteOrderDialogOpen] =
        useState(false);

    const handleDeleteOrder = () => {
        setDeletingOrder(true);

        router.delete(destroyOrder(order), {
            preserveScroll: true,
            onFinish: () => {
                setDeletingOrder(false);
            },
        });
    };

    // handleSendMessage moved to SupportChat

    return (
        <>
            <SeoHead title={`Manage Order ${order.order_number}`} />

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
                description={`Customer: ${order.user.name} (${order.user.email}) | Date: ${new Date(order.created_at).toLocaleString()}`}
                variant="transparent"
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={deletingOrder}
                            onClick={() => setIsDeleteOrderDialogOpen(true)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                        </Button>
                        <form
                            onSubmit={handleUpdateStatus}
                            className="flex items-center gap-2 rounded-lg border bg-card p-2 shadow-sm"
                        >
                            <select
                                value={statusData.status}
                                onChange={(e) =>
                                    setStatusData('status', e.target.value)
                                }
                                className="rounded-md border bg-background px-3 py-1.5 text-sm"
                            >
                                <option value="pending">Pending</option>
                                <option value="delivering">Delivering</option>
                                <option value="completed">Completed</option>
                            </select>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={
                                    processingStatus ||
                                    statusData.status === order.status
                                }
                            >
                                Update Status
                            </Button>
                        </form>
                    </div>
                }
            >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {/* Order Items */}
                        <div className="rounded-xl border bg-card p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Items</h2>
                                <div className="text-lg font-bold">
                                    Total: {formatNpr(order.total_amount)}
                                </div>
                            </div>
                            <div className="divide-y border-t">
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
                                                Qty: {item.quantity} | Selling
                                                Price: {formatNpr(item.price)}
                                            </p>
                                            {order.status === 'completed' && (
                                                <div className="mt-2 rounded border border-success/30 bg-success-surface px-3 py-2 text-sm text-success">
                                                    <div className="flex justify-between">
                                                        <span>
                                                            Purchase Price:
                                                        </span>
                                                        <span>
                                                            {formatNpr(
                                                                item.purchase_price,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 flex justify-between font-semibold">
                                                        <span>Profit:</span>
                                                        <span>
                                                            {formatNpr(
                                                                (parseFloat(
                                                                    item.price,
                                                                ) -
                                                                    parseFloat(
                                                                        item.purchase_price,
                                                                    )) *
                                                                    item.quantity,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
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
                                            {item.service_invoices &&
                                                item.service_invoices.map(
                                                    (invoice) => (
                                                        <ServiceInvoiceCard
                                                            key={invoice.id}
                                                            invoice={
                                                                invoice as any
                                                            }
                                                        />
                                                    ),
                                                )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Additional Information */}
                        {order.additional_data?.note && (
                            <div className="rounded-xl border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Additional Information
                                </h2>
                                <div className="rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap text-foreground">
                                    {order.additional_data.note}
                                </div>
                            </div>
                        )}

                        {/* Digital Delivery Credentials */}
                        {order.items.some(
                            (item) =>
                                item.product_variant.product.type === 'digital',
                        ) && (
                            <div className="rounded-xl border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Digital Delivery
                                </h2>
                                <div className="mb-6 space-y-4">
                                    {order.credentials.map((cred) => (
                                        <div
                                            key={cred.id}
                                            className="rounded-lg bg-muted p-4"
                                        >
                                            {editingCredentialId === cred.id ? (
                                                <form
                                                    onSubmit={(e) =>
                                                        handleEditCredentialSubmit(
                                                            e,
                                                            cred.id,
                                                        )
                                                    }
                                                >
                                                    <Textarea
                                                        value={editCredContent}
                                                        onChange={(e) =>
                                                            setEditCredContent(
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="mb-2 min-h-25 font-mono text-sm"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                setEditingCredentialId(
                                                                    null,
                                                                )
                                                            }
                                                        >
                                                            Cancel
                                                        </Button>
                                                        <Button
                                                            type="submit"
                                                            size="sm"
                                                        >
                                                            Save
                                                        </Button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <>
                                                    <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap">
                                                        {cred.content}
                                                    </pre>
                                                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingCredentialId(
                                                                        cred.id,
                                                                    );
                                                                    setEditCredContent(
                                                                        cred.content,
                                                                    );
                                                                }}
                                                                className="flex items-center gap-1 hover:text-foreground"
                                                            >
                                                                <Pencil className="h-3 w-3" />{' '}
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setCredentialToDelete(
                                                                        cred.id,
                                                                    )
                                                                }
                                                                className="flex items-center gap-1 text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-3 w-3" />{' '}
                                                                Delete
                                                            </button>
                                                        </div>
                                                        <div>
                                                            Added on{' '}
                                                            {new Date(
                                                                cred.created_at,
                                                            ).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {order.credentials.length === 0 && (
                                        <div className="text-sm text-muted-foreground italic">
                                            No digital credentials have been
                                            delivered yet.
                                        </div>
                                    )}
                                </div>

                                <form
                                    onSubmit={handleAddCredential}
                                    className="border-t pt-4"
                                >
                                    <h3 className="mb-2 text-sm font-medium">
                                        Deliver New Credential
                                    </h3>
                                    <Textarea
                                        value={credData.content}
                                        onChange={(e) =>
                                            setCredData(
                                                'content',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Enter login details, activation codes, or secure links here..."
                                        className="mb-2 min-h-25 font-mono text-sm"
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={
                                                processingCred ||
                                                !credData.content.trim()
                                            }
                                        >
                                            Deliver to Customer
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        {/* Payment breakdown */}
                        {parseFloat(order.total_amount) > 0 && (
                            <div className="rounded-xl border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Payment Breakdown
                                </h2>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Items
                                        </span>
                                        <span>
                                            {formatNpr(order.items_total)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Shipping
                                        </span>
                                        <span>
                                            {formatNpr(order.shipping_total)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 font-semibold">
                                        <span>Total</span>
                                        <span>
                                            {formatNpr(order.total_amount)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            Paid / due now
                                        </span>
                                        <span>
                                            {formatNpr(order.amount_due_now)}
                                        </span>
                                    </div>
                                    {Number(order.balance_due) > 0 && (
                                        <div className="flex items-center justify-between text-amber-600">
                                            <span>Balance due on delivery</span>
                                            <span className="flex items-center gap-2">
                                                {formatNpr(order.balance_due)}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        router.patch(
                                                            markBalancePaid(
                                                                order,
                                                            ).url,
                                                            {},
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    Mark paid
                                                </Button>
                                            </span>
                                        </div>
                                    )}
                                    {order.payment_option && (
                                        <p className="pt-1 text-xs text-muted-foreground">
                                            Payment option:{' '}
                                            {order.payment_option ===
                                            'shipping_only'
                                                ? 'Shipping only (rest on delivery)'
                                                : 'Full payment'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Shipment */}
                        {order.shipment && (
                            <div className="rounded-xl border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Shipment
                                </h2>
                                <div className="mb-4 text-sm">
                                    <p className="font-medium">
                                        {order.shipment.recipient_name} ·{' '}
                                        {order.shipment.mobile_number}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {order.shipment.address_line},{' '}
                                        {order.shipment.city}
                                        {order.shipment.landmark
                                            ? ` (${order.shipment.landmark})`
                                            : ''}
                                    </p>
                                    {order.shipment.zone_name && (
                                        <p className="text-muted-foreground">
                                            Zone: {order.shipment.zone_name}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {shipmentStatuses.map((status) => (
                                        <Button
                                            key={status}
                                            size="sm"
                                            variant={
                                                order.shipment?.status ===
                                                status
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            className="capitalize"
                                            onClick={() =>
                                                router.patch(
                                                    updateShipmentStatus(order)
                                                        .url,
                                                    { status },
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            {status}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Payment Receipt */}
                        <div className="rounded-xl border bg-card p-6">
                            <h2 className="mb-4 text-xl font-semibold">
                                Payment Receipt
                            </h2>
                            {order.payment_receipt ? (
                                <div className="space-y-4">
                                    <div className="overflow-hidden rounded-lg border bg-muted p-2">
                                        <LightboxImageLink
                                            src={`/storage/${order.payment_receipt.file_path}`}
                                            alt="Payment Receipt"
                                            ariaLabel="View full-size payment receipt"
                                            className="w-full"
                                            imageClassName="h-auto max-h-60 w-full object-contain transition-opacity hover:opacity-90"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            Status:
                                        </span>
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                                order.payment_receipt.status ===
                                                'approved'
                                                    ? 'bg-success-surface text-success'
                                                    : order.payment_receipt
                                                            .status ===
                                                        'rejected'
                                                      ? 'bg-danger-surface text-danger'
                                                      : 'bg-warning-surface text-warning'
                                            }`}
                                        >
                                            {order.payment_receipt.status}
                                        </span>
                                    </div>
                                    {order.payment_receipt.status ===
                                        'pending' && (
                                        <div className="flex gap-2 border-t pt-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-success/40 text-success hover:bg-success/10"
                                                onClick={() =>
                                                    handleReceiptAction(
                                                        'approved',
                                                    )
                                                }
                                                disabled={processingReceipt}
                                            >
                                                <Check className="mr-1 h-4 w-4" />{' '}
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                                                onClick={() =>
                                                    handleReceiptAction(
                                                        'rejected',
                                                    )
                                                }
                                                disabled={processingReceipt}
                                            >
                                                <X className="mr-1 h-4 w-4" />{' '}
                                                Reject
                                            </Button>
                                        </div>
                                    )}

                                    {!order.can_reupload_receipt && (
                                        <div className="mt-4 border-t pt-4">
                                            {order.request_receipt_upload && (
                                                <div className="mb-3 flex items-center text-sm font-medium text-amber-600">
                                                    User requested to re-upload
                                                    receipt.
                                                </div>
                                            )}
                                            <Button
                                                variant="outline"
                                                className="w-fit"
                                                onClick={() => {
                                                    router.patch(
                                                        allowReceiptReupload(
                                                            order,
                                                        ),
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    );
                                                }}
                                            >
                                                <Upload className="mr-2 h-4 w-4" />{' '}
                                                Allow Receipt Re-upload
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                                    No receipt uploaded yet. Customer needs to
                                    complete NPR payment.
                                </div>
                            )}
                        </div>

                        {/* Order Messages */}
                        <SupportChat
                            order={order}
                            postUrl={storeMessage.url(order)}
                        />
                    </div>
                </div>
            </PagePanel>

            {isDeleteOrderDialogOpen && (
                <ConfirmDialog
                    title="Are you sure you want to delete this order completely?"
                    description={
                        <>
                            This permanently removes order {order.order_number}{' '}
                            along with its items, receipt, messages, shipment,
                            and any subscription bought in it. This cannot be
                            undone.
                        </>
                    }
                    confirmLabel="Delete Order"
                    onConfirm={handleDeleteOrder}
                    onOpenChange={() => setIsDeleteOrderDialogOpen(false)}
                />
            )}

            {credentialToDelete !== null && (
                <ConfirmDialog
                    title="Are you sure you want to delete this credential?"
                    description="The customer will no longer be able to see it. This cannot be undone."
                    onConfirm={() => handleDeleteCredential(credentialToDelete)}
                    onOpenChange={() => setCredentialToDelete(null)}
                />
            )}
        </>
    );
}

AdminOrderShow.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: dashboard().url },
        { title: 'Orders', href: adminOrdersIndex().url },
        { title: 'Order Details', href: '#' },
    ],
};
