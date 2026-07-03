import { useForm } from '@inertiajs/react';
import { GripVertical, Trash2, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentGroup,
    AttachmentMedia,
} from '@/components/ui/attachment';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import NovelEditor from '@/components/ui/editor/novel-editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MediaManager } from '@/components/ui/media-manager';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export type ProductGallery = {
    id: number;
    image_path: string;
    sort_order: number;
};

export type Product = {
    id: number;
    title: string;
    slug?: string;
    description: string;
    image?: string;
    in_stock?: boolean;
    category_id?: number | null;
    galleries?: ProductGallery[];
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

type GalleryImage = {
    type: 'existing' | 'new';
    id?: number;
    image_path?: string;
    file?: File;
    previewUrl?: string;
};

export function ProductForm({
    product,
    submitUrl,
    isEditing = false,
    categories = [],
}: ProductFormProps) {
    const { data, setData, post, processing, errors, transform } = useForm({
        _method: isEditing ? 'put' : 'post',
        title: product?.title || '',
        description: product?.description || '',
        image: null as File | null,
        in_stock: product?.in_stock ?? true,
        category_id: product?.category_id || '',
    });

    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>(() => {
        return (product?.galleries || []).map((g) => ({
            type: 'existing',
            id: g.id,
            image_path: `/storage/${g.image_path}`,
        }));
    });

    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Keep the latest gallery state available to the unmount cleanup below.
    const galleryImagesRef = useRef(galleryImages);
    
    useEffect(() => {
        galleryImagesRef.current = galleryImages;
    }, [galleryImages]);

    useEffect(() => {
        return () => {
            galleryImagesRef.current.forEach((image) => {
                if (image.previewUrl) {
                    URL.revokeObjectURL(image.previewUrl);
                }
            });
        };
    }, []);

    transform((data) => {
        const existing_galleries = galleryImages
            .filter((g) => g.type === 'existing')
            .map((g) => g.id!);
        const new_galleries = galleryImages
            .filter((g) => g.type === 'new')
            .map((g) => g.file!);
        const gallery_orders = galleryImages.map((g) => {
            if (g.type === 'existing') {
                return `existing:${g.id}`;
            }

            const idx = new_galleries.indexOf(g.file!);

            return `new:${idx}`;
        });

        return {
            ...data,
            in_stock: data.in_stock ? 1 : 0,
            update_galleries: 1,
            existing_galleries,
            new_galleries,
            gallery_orders,
        };
    });

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (!files.length) {
return;
}

        const validFiles = files.filter((f) => f.size <= 1024 * 1024);

        if (validFiles.length < files.length) {
            toast.error('Some files were ignored because they exceed 1 MB.');
        }

        if (galleryImages.length + validFiles.length > 6) {
            toast.error('Maximum of 6 gallery images allowed.');

            if (galleryInputRef.current) {
galleryInputRef.current.value = '';
}

            return;
        }

        const newImages: GalleryImage[] = validFiles.map((file) => ({
            type: 'new',
            file,
            previewUrl: URL.createObjectURL(file),
        }));

        setGalleryImages((prev) => {
            return [...prev, ...newImages];
        });

        if (galleryInputRef.current) {
galleryInputRef.current.value = '';
}
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === targetIndex) {
return;
}

        setGalleryImages((prev) => {
            const next = [...prev];
            const [removed] = next.splice(draggedIndex, 1);
            next.splice(targetIndex, 0, removed);

            return next;
        });
        setDraggedIndex(null);
    };

    const removeImage = (index: number) => {
        setGalleryImages((prev) => {
            const next = [...prev];
            const removed = next.splice(index, 1)[0];

            if (removed.type === 'new' && removed.previewUrl) {
                URL.revokeObjectURL(removed.previewUrl);
            }

            return next;
        });
    };

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
                    <CardContent className="grid gap-6 pb-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Premium Wireless Headphones"
                                value={data.title}
                                onChange={(e) =>
                                    setData('title', e.target.value)
                                }
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
                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm ring-offset-background placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                value={data.category_id || ''}
                                onChange={(e) =>
                                    setData('category_id', e.target.value ? Number(e.target.value) : '')
                                }
                            >
                                <option value="">Select a category</option>
                                {categories.map((category) => (
                                    <option
                                        key={category.id}
                                        value={category.id}
                                    >
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
                            <Switch
                                id="in_stock"
                                checked={data.in_stock}
                                onCheckedChange={(checked) =>
                                    setData('in_stock', checked)
                                }
                            />
                            <Label htmlFor="in_stock">
                                Product is listed and in stock
                            </Label>
                            {errors.in_stock && (
                                <div className="ml-2 text-sm font-medium text-destructive">
                                    {errors.in_stock}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Product Gallery */}
                            <div className="flex flex-col h-full gap-2">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <Label>Product Gallery (Max 6, 1MB each)</Label>
                                        <p className="text-sm text-muted-foreground">Upload and reorder extra images for the product page.</p>
                                    </div>
                                    <input
                                        type="file"
                                        ref={galleryInputRef}
                                        onChange={handleGalleryChange}
                                        className="hidden"
                                        accept="image/*"
                                        multiple
                                    />
                                    <Button
                                        type="button"
                                        onClick={() => galleryInputRef.current?.click()}
                                        variant="secondary"
                                        size="sm"
                                        disabled={galleryImages.length >= 6}
                                        className="w-full sm:w-auto"
                                    >
                                        <UploadCloud className="mr-2 size-4" />
                                        Upload Images
                                    </Button>
                                </div>

                                {galleryImages.length > 0 ? (
                                    <TooltipProvider>
                                        <AttachmentGroup className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 content-start pt-2">
                                            {galleryImages.map((media, index) => (
                                                <div
                                                    key={media.type === 'existing' ? `existing-${media.id}` : `new-${index}`}
                                                    draggable
                                                    onDragStart={() => handleDragStart(index)}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, index)}
                                                    className={`relative cursor-grab active:cursor-grabbing ${
                                                        draggedIndex === index ? 'opacity-50' : 'opacity-100'
                                                    }`}
                                                >
                                                    <Attachment
                                                        size="xs"
                                                        orientation="vertical"
                                                        className="w-full! min-w-0 has-data-[slot=attachment-content]:w-full! pointer-events-none"
                                                    >
                                                        <AttachmentMedia
                                                            variant="image"
                                                            className="w-full! rounded-md"
                                                        >
                                                            <img
                                                                src={media.type === 'existing' ? media.image_path : media.previewUrl}
                                                                alt="Gallery preview"
                                                                loading="lazy"
                                                            />
                                                        </AttachmentMedia>
                                                    </Attachment>
                                                    <div className="absolute top-1 left-1 bg-background/90 shadow-sm backdrop-blur-sm rounded-md p-1 opacity-80 hover:opacity-100">
                                                        <GripVertical className="size-4" />
                                                    </div>
                                                    <AttachmentActions className="absolute top-1 right-1 gap-1 opacity-100 pointer-events-auto">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AttachmentAction
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="destructive"
                                                                    className="size-7 shadow-sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeImage(index);
                                                                    }}
                                                                >
                                                                    <Trash2 className="size-3.5" />
                                                                    <span className="sr-only">Delete</span>
                                                                </AttachmentAction>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Delete</TooltipContent>
                                                        </Tooltip>
                                                    </AttachmentActions>
                                                </div>
                                            ))}
                                        </AttachmentGroup>
                                    </TooltipProvider>
                                ) : (
                                    <div className="flex flex-1 min-h-[144px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground mt-2">
                                        No gallery images uploaded yet.
                                    </div>
                                )}
                                
                                {Object.keys(errors).filter((key) => key === 'new_galleries' || key.startsWith('new_galleries.')).length > 0 && (
                                    <div className="text-sm font-medium text-destructive">
                                        {Object.keys(errors)
                                            .filter((key) => key === 'new_galleries' || key.startsWith('new_galleries.'))
                                            .map((key) => (
                                                <div key={key}>{errors[key as keyof typeof errors]}</div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* Main Product Image */}
                            <div className="flex flex-col h-full gap-2">
                                <Label>Main Product Image</Label>
                                <div className="mt-2 flex flex-1 min-h-[144px] justify-center rounded-lg border border-dashed border-muted-foreground/25 px-6 py-10 items-center">
                                    <div className="text-center">
                                        <UploadCloud
                                            className="mx-auto h-12 w-12 text-muted-foreground/50"
                                            aria-hidden="true"
                                        />
                                        <div className="mt-4 flex flex-col items-center text-sm leading-6 text-muted-foreground">
                                            <div className="flex">
                                                <label
                                                    htmlFor="image"
                                                    className="relative cursor-pointer rounded-md bg-background font-semibold text-primary focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:outline-none hover:text-primary/80"
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
                                                                    ? e.target
                                                                          .files[0]
                                                                    : null,
                                                            )
                                                        }
                                                        accept="image/*"
                                                    />
                                                </label>
                                                <p className="pl-1">
                                                    or drag and drop
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-xs leading-5 text-muted-foreground">
                                            {data.image
                                                ? data.image.name
                                                : isEditing && product?.image
                                                  ? 'Leave blank to keep current image'
                                                  : 'PNG, JPG, WEBP up to 10MB'}
                                        </p>
                                        {isEditing &&
                                            product?.image &&
                                            !data.image && (
                                                <div className="mt-4 flex justify-center">
                                                    <img
                                                        src={`/storage/${product.image}`}
                                                        className="h-24 w-24 rounded border object-cover"
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
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <NovelEditor
                                initialValue={data.description}
                                onChange={(html) =>
                                    setData('description', html)
                                }
                            />
                            {errors.description && (
                                <div className="text-sm font-medium text-destructive">
                                    {errors.description}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-2">
                            <MediaManager />
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
