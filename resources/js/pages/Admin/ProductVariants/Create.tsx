import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { PagePanel } from '@/components/page-panel';

type Product = {
    id: number;
    title: string;
};

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

export default function CreateVariant({ product }: { product: Product }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        details: '',
        price_npr: '',
        purchase_price_npr: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/products/${product.id}/variants`);
    };

    return (
        <>
            <Head title={`Create Variant - ${product.title}`} />

            <PagePanel title={`Create Variant for ${product.title}`} variant="transparent">
                <Card>
                    <CardHeader>
                        <CardTitle>Variant Details</CardTitle>
                        <CardDescription>
                            Add a new pricing or options variant for this product.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="flex flex-col gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
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
                                    onChange={(e) => setData('details', e.target.value)}
                                    placeholder="Variant details or description"
                                    className="h-32"
                                />
                                {errors.details && (
                                    <div className="text-sm text-destructive">
                                        {errors.details}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="price_npr">Selling Price (NPR)</Label>
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
                                    <Label htmlFor="purchase_price_npr">Purchase Price (NPR)</Label>
                                    <Input
                                        id="purchase_price_npr"
                                        type="number"
                                        step="0.01"
                                        value={data.purchase_price_npr}
                                        onChange={(e) =>
                                            setData('purchase_price_npr', e.target.value)
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

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto mt-2"
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
