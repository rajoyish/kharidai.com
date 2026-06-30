import { Head, useForm } from '@inertiajs/react';
import { store as storeVariant } from '@/actions/App/Http/Controllers/Admin/ProductVariantController';
import { PagePanel } from '@/components/page-panel';
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
import { Textarea } from '@/components/ui/textarea';

type Product = {
    id: number;
    title: string;
    slug: string;
};

export default function CreateVariant({ product }: { product: Product }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        details: '',
        price_npr: '',
        purchase_price_npr: '',
        validity_days: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(storeVariant.url(product));
    };

    return (
        <>
            <Head title={`Create Variant - ${product.title}`} />

            <PagePanel
                title={`Create Variant for ${product.title}`}
                variant="transparent"
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Variant Details</CardTitle>
                        <CardDescription>
                            Add a new pricing or options variant for this
                            product.
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
                                    placeholder="e.g. 18 Months | Activation Link"
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
                                        setData('validity_days', e.target.value)
                                    }
                                    placeholder="30"
                                />
                                <div className="text-sm text-muted-foreground">
                                    Leave this blank for lifetime or one-time
                                    purchase products. Fill it only for timed
                                    subscriptions.
                                </div>
                                {errors.validity_days && (
                                    <div className="text-sm text-destructive">
                                        {errors.validity_days}
                                    </div>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="mt-2 w-full sm:w-auto"
                            >
                                Create Variant
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </PagePanel>
        </>
    );
}

CreateVariant.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/admin/products' },
        { title: 'Variants', href: '#' },
    ],
};
