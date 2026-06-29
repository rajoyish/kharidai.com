import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import NovelEditor from '@/components/ui/editor/novel-editor';
import { MediaManager } from '@/components/ui/media-manager';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';

export type Product = {
    id: number;
    title: string;
    slug?: string;
    description: string;
    image?: string;
    in_stock?: boolean;
    category_id?: number | null;
};

type Category = {
    id: number;
    name: string;
};

type ProductFormProps = {
    product?: Product;
    submitUrl: string;
    isEditing?: boolean;
    categories?: Category[];
};

export function ProductForm({ product, submitUrl, isEditing = false, categories = [] }: ProductFormProps) {
    const { data, setData, post, processing, errors } = useForm({
        _method: isEditing ? 'put' : 'post',
        title: product?.title || '',
        description: product?.description || '',
        image: null as File | null,
        in_stock: product?.in_stock ?? true,
        category_id: product?.category_id || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(submitUrl);
    };

    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">
                        {isEditing ? 'Edit Product' : 'Create Product'}
                    </CardTitle>
                    <CardDescription>
                        {isEditing
                            ? 'Update product details in your store inventory.'
                            : 'Add a new product to your store inventory.'}
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
                            <Label htmlFor="category_id">Category</Label>
                            <select
                                id="category_id"
                                className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}
                            >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                            {errors.category_id && (
                                <div className="text-sm font-medium text-destructive">
                                    {errors.category_id}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="in_stock"
                                checked={data.in_stock}
                                onChange={(e) => setData('in_stock', e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="in_stock">Product is listed and in stock</Label>
                            {errors.in_stock && (
                                <div className="text-sm font-medium text-destructive ml-2">
                                    {errors.in_stock}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <NovelEditor
                                initialValue={data.description}
                                onChange={(html) => setData('description', html)}
                            />
                            {errors.description && (
                                <div className="text-sm font-medium text-destructive">
                                    {errors.description}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <Label>Media Manager</Label>
                            <MediaManager />
                        </div>

                        <div className="grid gap-2">
                            <Label>Product Image</Label>
                            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-muted-foreground/25 px-6 py-10">
                                <div className="text-center">
                                    <UploadCloud
                                        className="mx-auto h-12 w-12 text-muted-foreground/50"
                                        aria-hidden="true"
                                    />
                                    <div className="mt-4 flex flex-col items-center text-sm leading-6 text-muted-foreground">
                                        <div className="flex">
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
                                                            e.target.files ? e.target.files[0] : null,
                                                        )
                                                    }
                                                    accept="image/*"
                                                />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                    </div>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        {data.image
                                            ? data.image.name
                                            : isEditing && product?.image
                                            ? 'Leave blank to keep current image'
                                            : 'PNG, JPG, WEBP up to 10MB'}
                                    </p>
                                    {isEditing && product?.image && !data.image && (
                                        <div className="mt-4 flex justify-center">
                                            <img
                                                src={`/storage/${product.image}`}
                                                className="h-24 w-24 rounded object-cover border"
                                                alt="Current product image"
                                            />
                                        </div>
                                    )}
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
                        <Button type="submit" disabled={processing}>
                            {processing
                                ? isEditing
                                    ? 'Updating...'
                                    : 'Creating...'
                                : isEditing
                                ? 'Update Product'
                                : 'Create Product'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
