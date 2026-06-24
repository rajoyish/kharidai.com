import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CreateProduct() {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        description: '',
        image: null as File | null,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/products');
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Products', href: '/admin/products' },
                { title: 'Create', href: '/admin/products/create' },
            ]}
        >
            <Head title="Create Product" />

            <div className="flex h-full max-w-2xl flex-1 flex-col gap-4 rounded-xl p-4">
                <h2 className="text-xl font-bold">Create Product</h2>

                <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                        />
                        {errors.title && (
                            <div className="text-sm text-red-500">
                                {errors.title}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                        />
                        {errors.description && (
                            <div className="text-sm text-red-500">
                                {errors.description}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="image">Image</Label>
                        <Input
                            id="image"
                            type="file"
                            onChange={(e) =>
                                setData(
                                    'image',
                                    e.target.files ? e.target.files[0] : null,
                                )
                            }
                            accept="image/*"
                        />
                        {errors.image && (
                            <div className="text-sm text-red-500">
                                {errors.image}
                            </div>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={processing}
                        className="w-fit"
                    >
                        Create Product
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
