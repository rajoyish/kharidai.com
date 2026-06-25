import { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, X, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { PagePanel } from '@/components/page-panel';

type Order = {
    id: number;
    order_number: string;
    total_amount: string;
    currency: string;
    status: string;
    created_at: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
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

export default function AdminOrderShow({ order }: { order: Order }) {
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

    const {
        data: msgData,
        setData: setMsgData,
        post: postMsg,
        processing: processingMsg,
        reset: resetMsg,
    } = useForm({
        message: '',
    });

    const handleUpdateStatus = (e: React.FormEvent) => {
        e.preventDefault();
        patchStatus(`/admin/orders/${order.id}/status`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Order status updated'),
        });
    };

    const [processingReceipt, setProcessingReceipt] = useState(false);

    const handleReceiptAction = (status: 'approved' | 'rejected') => {
        if (!order.payment_receipt) return;
        router.patch(`/admin/receipts/${order.payment_receipt.id}/status`, { status }, {
            preserveScroll: true,
            onStart: () => setProcessingReceipt(true),
            onFinish: () => setProcessingReceipt(false),
            onSuccess: () => toast.success(`Receipt ${status}`),
        });
    };

    const [editingCredentialId, setEditingCredentialId] = useState<number | null>(null);
    const [editCredContent, setEditCredContent] = useState('');

    const handleEditCredentialSubmit = (e: React.FormEvent, credId: number) => {
        e.preventDefault();
        router.put(`/admin/orders/${order.id}/credentials/${credId}`, { content: editCredContent }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingCredentialId(null);
                toast.success('Credential updated');
            }
        });
    };

    const handleDeleteCredential = (credId: number) => {
        if (!confirm('Are you sure you want to delete this credential?')) return;
        router.delete(`/admin/orders/${order.id}/credentials/${credId}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Credential deleted')
        });
    };

    const handleAddCredential = (e: React.FormEvent) => {
        e.preventDefault();
        postCred(`/admin/orders/${order.id}/credentials`, {
            preserveScroll: true,
            onSuccess: () => resetCred('content'),
        });
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        postMsg(`/admin/orders/${order.id}/messages`, {
            preserveScroll: true,
            onSuccess: () => resetMsg('message'),
        });
    };

    return (
        <>
            <Head title={`Manage Order ${order.order_number}`} />

            <PagePanel
                title={`Order ${order.order_number}`}
                description={`Customer: ${order.user.name} (${order.user.email}) | Date: ${new Date(order.created_at).toLocaleString()}`}
                variant="transparent"
                actions={
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
                }
            >

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {/* Order Items */}
                        <div className="rounded-xl border bg-card p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Items</h2>
                                <div className="text-lg font-bold">
                                    Total:{' '}
                                    {order.currency === 'npr' ? 'Rs.' : '$'}{' '}
                                    {order.total_amount}
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
                            <div className="mb-6 space-y-4">
                                {order.credentials.map((cred) => (
                                    <div
                                        key={cred.id}
                                        className="rounded-lg bg-muted p-4"
                                    >
                                        {editingCredentialId === cred.id ? (
                                            <form onSubmit={(e) => handleEditCredentialSubmit(e, cred.id)}>
                                                <Textarea
                                                    value={editCredContent}
                                                    onChange={(e) => setEditCredContent(e.target.value)}
                                                    className="mb-2 min-h-[100px] font-mono text-sm"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingCredentialId(null)}>Cancel</Button>
                                                    <Button type="submit" size="sm">Save</Button>
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
                                                                setEditingCredentialId(cred.id);
                                                                setEditCredContent(cred.content);
                                                            }}
                                                            className="flex items-center gap-1 hover:text-foreground"
                                                        >
                                                            <Pencil className="h-3 w-3" /> Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCredential(cred.id)}
                                                            className="flex items-center gap-1 text-red-500 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-3 w-3" /> Delete
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
                                        setCredData('content', e.target.value)
                                    }
                                    placeholder="Enter login details, activation codes, or secure links here..."
                                    className="mb-2 min-h-[100px] font-mono text-sm"
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
                    </div>

                    <div className="space-y-6">
                        {/* Payment Receipt */}
                        {order.currency === 'npr' && (
                            <div className="rounded-xl border bg-card p-6">
                                <h2 className="mb-4 text-xl font-semibold">
                                    Payment Receipt
                                </h2>
                                {order.payment_receipt ? (
                                    <div className="space-y-4">
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
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                Status:
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                                    order.payment_receipt
                                                        .status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : order.payment_receipt
                                                                .status ===
                                                            'rejected'
                                                          ? 'bg-red-100 text-red-800'
                                                          : 'bg-amber-100 text-amber-800'
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
                                                    className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
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
                                                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
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
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                                        No receipt uploaded yet. Customer needs
                                        to complete NPR payment.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Order Messages */}
                        <div className="flex h-[500px] flex-col rounded-xl border bg-card p-6">
                            <h2 className="mb-4 flex-shrink-0 text-xl font-semibold">
                                Support Chat
                            </h2>
                            <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2">
                                {order.messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex flex-col ${!msg.user.is_admin ? 'items-start' : 'items-end'}`}
                                    >
                                        <span className="mx-1 mb-1 text-xs text-muted-foreground">
                                            {!msg.user.is_admin
                                                ? 'Customer'
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
                                                !msg.user.is_admin
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
                                        No messages yet.
                                    </div>
                                )}
                            </div>
                            <form
                                onSubmit={handleSendMessage}
                                className="mt-auto flex flex-shrink-0 gap-2 border-t pt-2"
                            >
                                <Textarea
                                    value={msgData.message}
                                    onChange={(e) =>
                                        setMsgData('message', e.target.value)
                                    }
                                    placeholder="Type your reply..."
                                    className="min-h-[60px] resize-none"
                                />
                                <Button
                                    type="submit"
                                    disabled={
                                        processingMsg || !msgData.message.trim()
                                    }
                                    className="h-auto"
                                >
                                    Send
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            </PagePanel>
        </>
    );
}

AdminOrderShow.layout = {
    breadcrumbs: [
        { title: 'Admin Dashboard', href: '/admin' },
        { title: 'Orders', href: '/admin/orders' },
        { title: 'Order Details', href: '#' },
    ],
};
