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

export default function CreateVariant({ product }: { product: Product }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        details: '',
        price_npr: '',
        price_usd: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/admin/products/${product.id}/variants`);
    };

    return (
        <>
            <Head title={`Create Variant - ${product.title}`} />

            <PagePanel title={`Create Variant for ${product.title}`}>
                <form onSubmit={submit} className="flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        {errors.name && (
                            <div className="text-sm text-red-500">
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
                            <div className="text-sm text-red-500">
                                {errors.details}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="price_npr">Price (NPR)</Label>
                        <Input
                            id="price_npr"
                            type="number"
                            step="0.01"
                            value={data.price_npr}
                            onChange={(e) =>
                                setData('price_npr', e.target.value)
                            }
                            required
                        />
                        {errors.price_npr && (
                            <div className="text-sm text-red-500">
                                {errors.price_npr}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="price_usd">Price (USD)</Label>
                        <Input
                            id="price_usd"
                            type="number"
                            step="0.01"
                            value={data.price_usd}
                            onChange={(e) =>
                                setData('price_usd', e.target.value)
                            }
                            required
                        />
                        {errors.price_usd && (
                            <div className="text-sm text-red-500">
                                {errors.price_usd}
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={processing}
                        className="w-fit"
                    >
                        Create Variant
                    </Button>
                </form>
            </PagePanel>
        </>
    );
}

CreateVariant.layout = {
    breadcrumbs: [
                { title: 'Products', href: '/admin/products' },
                {
                    title: product.title,
                    href: `/admin/products/${product.id}/edit`,
                },
                {
                    title: 'Variants',
                    href: `/admin/products/${product.id}/variants`,
                },
                {
                    title: 'Create',
                    href: `/admin/products/${product.id}/variants/create`,
                },
            ],
};
