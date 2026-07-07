import { router, useForm } from '@inertiajs/react';
import { MapPin, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { home } from '@/routes';
import {
    destroy,
    index as addressesIndex,
    setDefault,
    update,
} from '@/actions/App/Http/Controllers/User/AddressController';
import { MobileNumberInput } from '@/components/mobile-number-input';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Address = {
    id: number;
    recipient_name: string;
    mobile_number: string;
    address_line: string;
    city: string;
    landmark: string | null;
    shipping_zone_id: number | null;
    is_default: boolean;
};

type Zone = {
    id: number;
    name: string;
};

const selectClassName =
    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

const breadcrumbs = [
    { title: 'Home', href: home() },
    { title: 'My Addresses', href: addressesIndex() },
];

export default function AddressIndex({
    addresses,
    zones,
}: {
    addresses: Address[];
    zones: Zone[];
}) {
    const [editing, setEditing] = useState<Address | null>(null);

    const { data, setData, put, processing, errors, reset, clearErrors } =
        useForm({
            recipient_name: '',
            mobile_number: '',
            address_line: '',
            city: '',
            landmark: '',
            shipping_zone_id: '' as number | '',
        });

    const openEditor = (address: Address) => {
        clearErrors();
        setData({
            recipient_name: address.recipient_name,
            mobile_number: address.mobile_number,
            address_line: address.address_line,
            city: address.city,
            landmark: address.landmark ?? '',
            shipping_zone_id: address.shipping_zone_id ?? '',
        });
        setEditing(address);
    };

    const closeEditor = () => {
        setEditing(null);
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!editing) {
            return;
        }

        put(update.url(editing), {
            preserveScroll: true,
            onSuccess: () => closeEditor(),
        });
    };

    return (
        <>
            <SeoHead title="My Addresses" />

            <PagePanel title="My Addresses" variant="transparent">
                {addresses.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        You have no saved addresses yet. They appear here after
                        you save one at checkout.
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {addresses.map((address) => (
                            <div
                                key={address.id}
                                className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 font-semibold">
                                        <MapPin className="size-4 text-muted-foreground" />
                                        {address.recipient_name}
                                    </div>
                                    {address.is_default && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                            <Star className="size-3" /> Default
                                        </span>
                                    )}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    <p>{address.address_line}</p>
                                    <p>{address.city}</p>
                                    {address.landmark && (
                                        <p>Landmark: {address.landmark}</p>
                                    )}
                                    <p>{address.mobile_number}</p>
                                </div>

                                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditor(address)}
                                    >
                                        <Pencil className="size-4" /> Edit
                                    </Button>
                                    {!address.is_default && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                router.patch(
                                                    setDefault.url(address),
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Star className="size-4" /> Set
                                            default
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() =>
                                            router.delete(destroy.url(address), {
                                                preserveScroll: true,
                                            })
                                        }
                                    >
                                        <Trash2 className="size-4" /> Delete
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PagePanel>

            <Dialog
                open={editing !== null}
                onOpenChange={(open) => !open && closeEditor()}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit address</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={submit} className="grid gap-4">
                        <div className="grid gap-1">
                            <Label htmlFor="recipient_name">Recipient name</Label>
                            <Input
                                id="recipient_name"
                                value={data.recipient_name}
                                onChange={(e) =>
                                    setData('recipient_name', e.target.value)
                                }
                            />
                            {errors.recipient_name && (
                                <p className="text-sm text-destructive">
                                    {errors.recipient_name}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="mobile_number">Mobile number</Label>
                            <MobileNumberInput
                                id="mobile_number"
                                value={data.mobile_number}
                                onChange={(e) =>
                                    setData('mobile_number', e.target.value)
                                }
                            />
                            {errors.mobile_number && (
                                <p className="text-sm text-destructive">
                                    {errors.mobile_number}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="address_line">Address</Label>
                            <Input
                                id="address_line"
                                value={data.address_line}
                                onChange={(e) =>
                                    setData('address_line', e.target.value)
                                }
                            />
                            {errors.address_line && (
                                <p className="text-sm text-destructive">
                                    {errors.address_line}
                                </p>
                            )}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-1">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    value={data.city}
                                    onChange={(e) =>
                                        setData('city', e.target.value)
                                    }
                                />
                                {errors.city && (
                                    <p className="text-sm text-destructive">
                                        {errors.city}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-1">
                                <Label htmlFor="landmark">
                                    Landmark (optional)
                                </Label>
                                <Input
                                    id="landmark"
                                    value={data.landmark}
                                    onChange={(e) =>
                                        setData('landmark', e.target.value)
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="shipping_zone_id">Delivery zone</Label>
                            <select
                                id="shipping_zone_id"
                                className={selectClassName}
                                value={data.shipping_zone_id}
                                onChange={(e) =>
                                    setData(
                                        'shipping_zone_id',
                                        e.target.value
                                            ? Number(e.target.value)
                                            : '',
                                    )
                                }
                            >
                                <option value="">No zone selected</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>
                                        {zone.name}
                                    </option>
                                ))}
                            </select>
                            {errors.shipping_zone_id && (
                                <p className="text-sm text-destructive">
                                    {errors.shipping_zone_id}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditor}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

AddressIndex.layout = {
    breadcrumbs: breadcrumbs,
};
