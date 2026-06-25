import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';

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

            <div className="flex h-full flex-1 flex-col p-4 md:p-8">
                <div className="mx-auto w-full max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Create Product</CardTitle>
                            <CardDescription>
                                Add a new product to your store inventory.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={submit}>
                            <CardContent className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g. Premium Wireless Headphones"
                                        value={data.title}
                                        onChange={(e) => setData('title', e.target.value)}
                                        required
                                    />
                                    {errors.title && (
                                        <div className="text-sm font-medium text-destructive">
                                            {errors.title}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Input
                                        id="description"
                                        placeholder="Briefly describe the product..."
                                        value={data.description}
                                        onChange={(e) =>
                                            setData('description', e.target.value)
                                        }
                                    />
                                    {errors.description && (
                                        <div className="text-sm font-medium text-destructive">
                                            {errors.description}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <Label>Product Image</Label>
                                    <div className="mt-2 flex justify-center rounded-lg border border-dashed border-muted-foreground/25 px-6 py-10">
                                        <div className="text-center">
                                            <UploadCloud
                                                className="mx-auto h-12 w-12 text-muted-foreground/50"
                                                aria-hidden="true"
                                            />
                                            <div className="mt-4 flex text-sm leading-6 text-muted-foreground">
                                                <label
                                                    htmlFor="image"
                                                    className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 hover:text-primary/80"
                                                >
                                                    <span>Upload a file</span>
                                                    <Input
                                                        id="image"
                                                        type="file"
                                                        className="sr-only"
                                                        onChange={(e) =>
                                                            setData(
                                                                'image',
                                                                e.target.files
                                                                    ? e.target.files[0]
                                                                    : null,
                                                            )
                                                        }
                                                        accept="image/*"
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs leading-5 text-muted-foreground">
                                                {data.image ? data.image.name : 'PNG, JPG, WEBP up to 10MB'}
                                            </p>
                                        </div>
                                    </div>
                                    {errors.image && (
                                        <div className="text-sm font-medium text-destructive">
                                            {errors.image}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="justify-end border-t pt-6">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                >
                                    {processing ? 'Creating...' : 'Create Product'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
