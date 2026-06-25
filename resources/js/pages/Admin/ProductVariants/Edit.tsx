import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Product = {
    id: number;
    title: string;
};

type Variant = {
    id: number;
    name: string;
    details: string | null;
    price_npr: string;
    price_usd: string;
};

export default function EditVariant({
    product,
    variant,
}: {
    product: Product;
    variant: Variant;
}) {
    const { data, setData, put, processing, errors } = useForm({
        name: variant.name,
        details: variant.details || '',
        price_npr: variant.price_npr,
        price_usd: variant.price_usd,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/products/${product.id}/variants/${variant.id}`);
    };

    return (
        <AppLayout
            breadcrumbs={[
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
                    title: 'Edit',
                    href: `/admin/products/${product.id}/variants/${variant.id}/edit`,
                },
            ]}
        >
            <Head title={`Edit Variant - ${product.title}`} />

            <div className="flex h-full max-w-2xl flex-1 flex-col gap-4 rounded-xl p-4">
                <h2 className="text-xl font-bold">
                    Edit Variant: {variant.name}
                </h2>

                <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
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
                        Update Variant
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
