import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    destroy as destroyZone,
    index as shippingIndex,
    store as storeZone,
    update as updateZone,
} from '@/actions/App/Http/Controllers/Admin/ShippingController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatNpr } from '@/lib/currency';

type Zone = {
    id: number;
    name: string;
    is_active: boolean;
    sort_order: number;
    base_fee_npr: number;
    per_kg_fee_npr: number;
    parcel_capacity_kg: string | null;
    free_over_npr: number | null;
    min_days: number | null;
    max_days: number | null;
};

const emptyForm = {
    name: '',
    is_active: true,
    sort_order: 0,
    base_fee_npr: 0,
    per_kg_fee_npr: 0,
    parcel_capacity_kg: '',
    free_over_npr: '' as number | '',
    min_days: '' as number | '',
    max_days: '' as number | '',
};

const rupees = (value: number | null) =>
    value === null ? '—' : formatNpr(value);

export default function ShippingIndex({ zones }: { zones: Zone[] }) {
    const [editingZone, setEditingZone] = useState<Zone | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const { data, setData, post, put, processing, errors, reset } =
        useForm(emptyForm);

    const handleCreate = () => {
        setIsCreating(true);
        setEditingZone(null);
        reset();
    };

    const handleEdit = (zone: Zone) => {
        setEditingZone(zone);
        setIsCreating(false);
        setData({
            name: zone.name,
            is_active: zone.is_active,
            sort_order: zone.sort_order,
            base_fee_npr: zone.base_fee_npr,
            per_kg_fee_npr: zone.per_kg_fee_npr,
            parcel_capacity_kg: zone.parcel_capacity_kg ?? '',
            free_over_npr: zone.free_over_npr ?? '',
            min_days: zone.min_days ?? '',
            max_days: zone.max_days ?? '',
        });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingZone(null);
        reset();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isCreating) {
            post(storeZone.url(), { onSuccess: handleCancel });
        } else if (editingZone) {
            put(updateZone(editingZone).url, { onSuccess: handleCancel });
        }
    };

    const handleDelete = (zone: Zone) => {
        if (confirm(`Delete shipping zone "${zone.name}"?`)) {
            router.delete(destroyZone(zone).url, {
                preserveScroll: true,
            });
        }
    };

    return (
        <>
            <SeoHead title="Shipping Zones" />

            <PagePanel
                title="Shipping Zones"
                variant="transparent"
                actions={
                    <Button onClick={handleCreate} className="w-fit">
                        Add Zone
                    </Button>
                }
            >
                {(isCreating || editingZone) && (
                    <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold">
                            {isCreating ? 'Create Zone' : 'Edit Zone'}
                        </h3>
                        <form
                            onSubmit={handleSubmit}
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            <div className="flex flex-col gap-1 lg:col-span-2">
                                <Label htmlFor="name">Zone name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder="e.g. Inside Kathmandu Valley"
                                    required
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-500">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="sort_order">Sort order</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    min={0}
                                    value={data.sort_order}
                                    onChange={(e) =>
                                        setData(
                                            'sort_order',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                            </div>

                            <div className="flex items-center gap-2 sm:mt-6">
                                <Switch
                                    id="is_active"
                                    checked={data.is_active}
                                    onCheckedChange={(checked) =>
                                        setData('is_active', checked)
                                    }
                                />
                                <Label htmlFor="is_active">Active</Label>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="base_fee_npr">
                                    Base fee (Rs.)
                                </Label>
                                <Input
                                    id="base_fee_npr"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={data.base_fee_npr}
                                    onChange={(e) =>
                                        setData(
                                            'base_fee_npr',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                                {errors.base_fee_npr && (
                                    <p className="text-sm text-red-500">
                                        {errors.base_fee_npr}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="per_kg_fee_npr">
                                    Per kg fee (Rs.)
                                </Label>
                                <Input
                                    id="per_kg_fee_npr"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={data.per_kg_fee_npr}
                                    onChange={(e) =>
                                        setData(
                                            'per_kg_fee_npr',
                                            Number(e.target.value),
                                        )
                                    }
                                />
                                {errors.per_kg_fee_npr && (
                                    <p className="text-sm text-red-500">
                                        {errors.per_kg_fee_npr}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="parcel_capacity_kg">
                                    Parcel capacity (kg, optional)
                                </Label>
                                <Input
                                    id="parcel_capacity_kg"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={data.parcel_capacity_kg}
                                    onChange={(e) =>
                                        setData(
                                            'parcel_capacity_kg',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. 5"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Max weight per parcel. Light items combine
                                    up to this; leave blank to charge each item
                                    its own parcel.
                                </p>
                                {errors.parcel_capacity_kg && (
                                    <p className="text-sm text-red-500">
                                        {errors.parcel_capacity_kg}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="free_over_npr">
                                    Free over (Rs., optional)
                                </Label>
                                <Input
                                    id="free_over_npr"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={data.free_over_npr}
                                    onChange={(e) =>
                                        setData(
                                            'free_over_npr',
                                            e.target.value === ''
                                                ? ''
                                                : Number(e.target.value),
                                        )
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="min_days">Min days</Label>
                                    <Input
                                        id="min_days"
                                        type="number"
                                        min={0}
                                        value={data.min_days}
                                        onChange={(e) =>
                                            setData(
                                                'min_days',
                                                e.target.value === ''
                                                    ? ''
                                                    : Number(e.target.value),
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="max_days">Max days</Label>
                                    <Input
                                        id="max_days"
                                        type="number"
                                        min={0}
                                        value={data.max_days}
                                        onChange={(e) =>
                                            setData(
                                                'max_days',
                                                e.target.value === ''
                                                    ? ''
                                                    : Number(e.target.value),
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                                <Button type="submit" disabled={processing}>
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Zone</TableHead>
                            <TableHead>Base</TableHead>
                            <TableHead>Per kg</TableHead>
                            <TableHead>Parcel cap</TableHead>
                            <TableHead>Free over</TableHead>
                            <TableHead>Days</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {zones.map((zone) => (
                            <TableRow key={zone.id}>
                                <TableCell className="font-semibold">
                                    {zone.name}
                                </TableCell>
                                <TableCell>
                                    {rupees(zone.base_fee_npr)}
                                </TableCell>
                                <TableCell>
                                    {rupees(zone.per_kg_fee_npr)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {zone.parcel_capacity_kg
                                        ? `${zone.parcel_capacity_kg} kg`
                                        : '—'}
                                </TableCell>
                                <TableCell>
                                    {rupees(zone.free_over_npr)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {zone.min_days && zone.max_days
                                        ? `${zone.min_days}–${zone.max_days}`
                                        : '—'}
                                </TableCell>
                                <TableCell>
                                    {zone.is_active ? 'Yes' : 'No'}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(zone)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleDelete(zone)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {zones.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No shipping zones yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

ShippingIndex.layout = {
    breadcrumbs: [{ title: 'Shipping', href: shippingIndex().url }],
};
