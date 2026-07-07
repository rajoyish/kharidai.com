import { useForm } from '@inertiajs/react';
import { useState } from 'react';

import { update as updateVariant } from '@/actions/App/Http/Controllers/Admin/ProductVariantController';
import { PagePanel } from '@/components/page-panel';
import { PhysicalVariantFields } from '@/components/product-form/PhysicalVariantFields';
import { getProductTypeTheme } from '@/components/product-form/product-type-theme';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Product = {
    id: number;
    title: string;
    slug: string;
    type?: string;
};

type Variant = {
    id: number;
    name: string;
    details: string | null;
    price_npr: string;
    purchase_price_npr: string;
    validity_days: number | null;
    colors: string[] | null;
    sizes: string[] | null;
    weight_kg: string | null;
    ships_individually: boolean;
    advance_payment_percent: number | null;
};

export default function EditVariant({
    product,
    variant,
}: {
    product: Product;
    variant: Variant;
}) {
    const [hasValidity, setHasValidity] = useState(
        variant.validity_days != null,
    );

    const { data, setData, patch, processing, errors } = useForm({
        name: variant.name,
        details: variant.details || '',
        price_npr: variant.price_npr,
        purchase_price_npr: variant.purchase_price_npr || '',
        validity_days: variant.validity_days?.toString() ?? '',
        colors: variant.colors ?? [],
        sizes: variant.sizes ?? [],
        weight_kg: variant.weight_kg?.toString() ?? '',
        ships_individually: variant.ships_individually ?? false,
        advance_payment_percent:
            variant.advance_payment_percent?.toString() ?? '',
    });

    const isPhysical = product.type === 'physical';
    const theme = getProductTypeTheme(product.type);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(updateVariant.url({ product, variant }));
    };

    return (
        <>
            <SeoHead title={`Edit Variant - ${variant.name}`} />

            <PagePanel
                eyebrow="Edit Variant"
                title={product.title}
                variant="transparent"
            >
                <Card className={cn('transition-colors', theme.card)}>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle>Variant Details</CardTitle>
                            <Badge
                                variant="outline"
                                className={cn('gap-1.5', theme.badge)}
                            >
                                <theme.Icon
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                {theme.label}
                            </Badge>
                        </div>
                        <CardDescription>
                            Update pricing and details for this variant.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    required
                                    placeholder={theme.variantNamePlaceholder}
                                />
                                {errors.name && (
                                    <div className="text-sm text-destructive">
                                        {errors.name}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="details">Details</Label>
                                <Textarea
                                    id="details"
                                    value={data.details}
                                    onChange={(e) =>
                                        setData('details', e.target.value)
                                    }
                                    placeholder="Variant details or description"
                                    className="h-32"
                                />
                                {errors.details && (
                                    <div className="text-sm text-destructive">
                                        {errors.details}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="price_npr">
                                        Selling Price (NPR)
                                    </Label>
                                    <Input
                                        id="price_npr"
                                        type="number"
                                        step="0.01"
                                        value={data.price_npr}
                                        onChange={(e) =>
                                            setData('price_npr', e.target.value)
                                        }
                                        required
                                        placeholder="2100"
                                    />
                                    {errors.price_npr && (
                                        <div className="text-sm text-destructive">
                                            {errors.price_npr}
                                        </div>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="purchase_price_npr">
                                        Purchase Price (NPR)
                                    </Label>
                                    <Input
                                        id="purchase_price_npr"
                                        type="number"
                                        step="0.01"
                                        value={data.purchase_price_npr}
                                        onChange={(e) =>
                                            setData(
                                                'purchase_price_npr',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="1800"
                                    />
                                    {errors.purchase_price_npr && (
                                        <div className="text-sm text-destructive">
                                            {errors.purchase_price_npr}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="advance_payment_percent">
                                    Advance Payment (%)
                                </Label>
                                <Input
                                    id="advance_payment_percent"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={data.advance_payment_percent}
                                    onChange={(e) =>
                                        setData(
                                            'advance_payment_percent',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="e.g. 30"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Portion of this variant's price collected up
                                    front at checkout. Leave blank for none.
                                </p>
                                {errors.advance_payment_percent && (
                                    <div className="text-sm text-destructive">
                                        {errors.advance_payment_percent}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id="has_validity"
                                        checked={hasValidity}
                                        onCheckedChange={(checked) => {
                                            setHasValidity(checked);
                                            setData('validity_days', '');
                                        }}
                                    />
                                    <Label htmlFor="has_validity">
                                        Enable Validity Days
                                    </Label>
                                </div>

                                {hasValidity && (
                                    <div className="mt-2 grid gap-2">
                                        <Label htmlFor="validity_days">
                                            Validity Days
                                        </Label>
                                        <Input
                                            id="validity_days"
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={data.validity_days}
                                            onChange={(e) =>
                                                setData(
                                                    'validity_days',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="30"
                                        />
                                        <div className="text-sm text-muted-foreground">
                                            Leave this blank for lifetime or
                                            one-time purchase products. Fill it
                                            only for timed subscriptions.
                                        </div>
                                        {errors.validity_days && (
                                            <div className="text-sm text-destructive">
                                                {errors.validity_days}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {isPhysical && (
                                <PhysicalVariantFields
                                    theme={theme}
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                />
                            )}

                            <Button
                                type="submit"
                                disabled={processing}
                                className="mt-2 w-full sm:w-auto"
                            >
                                Update Variant
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </PagePanel>
        </>
    );
}

EditVariant.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/admin/products' },
        { title: 'Variants', href: '#' },
    ],
};
