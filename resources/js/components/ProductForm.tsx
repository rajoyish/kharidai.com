import { useForm } from '@inertiajs/react';
import {
    GripVertical,
    Search,
    SlidersHorizontal,
    Trash2,
    UploadCloud,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
    Attachment,
    AttachmentAction,
    AttachmentActions,
    AttachmentGroup,
    AttachmentMedia,
} from '@/components/ui/attachment';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { CategoryMultiSelect } from './category-multi-select';
import type { CategoryOption } from './category-multi-select';
import { ImageUpload } from './image-upload';
import { getProductTypeTheme } from './product-form/product-type-theme';
import type { ProductTypeTheme } from './product-form/product-type-theme';
import { ProductTypeFields } from './product-form/ProductTypeFields';

/** Recommended lengths before search engines truncate the snippet. */
const SEO_TITLE_LIMIT = 60;
const SEO_DESCRIPTION_LIMIT = 160;

export type ProductGallery = {
    id: number;
    image_path: string;
    sort_order: number;
};

export type Product = {
    id: number;
    type?: string;
    title: string;
    slug?: string;
    description: string;
    hidden_description?: string | null;
    image?: string;
    image_alt?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    in_stock?: boolean;
    is_visible?: boolean;
    categories?: { id: number }[];
    galleries?: ProductGallery[];
};

type Category = CategoryOption;

type ProductTypeOption = {
    value: string;
    label: string;
};

type ProductFormProps = {
    product?: Product & {
        service_detail?: {
            pricing_strategy?: string;
            pricing_config?: any;
            requires_brief?: boolean;
            delivery_days?: number | null;
            revisions?: number | null;
            requires_contract?: boolean;
            requires_advance?: boolean;
            advance_type?: string | null;
            advance_value?: number | null;
        };
    };
    submitUrl: string;
    isEditing?: boolean;
    categories?: Category[];
    productTypes?: ProductTypeOption[];
};

type GalleryImage = {
    type: 'existing' | 'new';
    id?: number;
    image_path?: string;
    file?: File;
    previewUrl?: string;
};

/**
 * Heading for one of the stacked panels inside the form's two columns. The icon
 * chip picks up the accent of the currently selected product type.
 */
function PanelHeading({
    theme,
    icon: Icon,
    title,
    description,
}: {
    theme: ProductTypeTheme;
    icon: typeof Search;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    theme.iconWrap,
                )}
            >
                <Icon className="size-4.5" aria-hidden="true" />
            </div>
            <div className="grid gap-0.5">
                <h3 className={cn('font-semibold', theme.accentText)}>
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

/** Turns amber past the recommended length, red once the field is over budget. */
function CharacterCount({ value, limit }: { value: string; limit: number }) {
    const length = value.length;

    return (
        <span
            className={cn(
                'text-xs tabular-nums',
                length > limit
                    ? 'text-destructive'
                    : length > limit * 0.9
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground',
            )}
        >
            {length}/{limit}
        </span>
    );
}

export function ProductForm({
    product,
    submitUrl,
    isEditing = false,
    categories = [],
    productTypes = [],
}: ProductFormProps) {
    const { data, setData, post, processing, errors, transform } = useForm({
        _method: isEditing ? 'put' : 'post',
        type: product?.type || 'digital',
        title: product?.title || '',
        description: product?.description || '',
        hidden_description: product?.hidden_description || '',
        image: null as File | null,
        image_alt: product?.image_alt || '',
        seo_title: product?.seo_title || '',
        seo_description: product?.seo_description || '',
        in_stock: product?.in_stock ?? true,
        is_visible: product?.is_visible ?? true,
        category_ids: (product?.categories ?? []).map(
            (category) => category.id,
        ) as number[],
        pricing_strategy: product?.service_detail?.pricing_strategy || '',
        pricing_config: product?.service_detail?.pricing_config || {},
        requires_brief: product?.service_detail?.requires_brief ?? true,
        delivery_days: product?.service_detail?.delivery_days || '',
        revisions: product?.service_detail?.revisions || '',
        requires_contract: product?.service_detail?.requires_contract ?? false,
        requires_advance: product?.service_detail?.requires_advance ?? false,
        advance_type: product?.service_detail?.advance_type || 'percent',
        advance_value: product?.service_detail?.advance_value || '',
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
            is_visible: data.is_visible ? 1 : 0,
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

    // Drives the accent theming of the whole form from the selected type.
    const theme = getProductTypeTheme(data.type);

    const galleryErrorKeys = Object.keys(errors).filter(
        (key) => key === 'new_galleries' || key.startsWith('new_galleries.'),
    );

    return (
        <div>
            <Card className={cn('transition-colors', theme.card)}>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-2xl">
                            {isEditing ? 'Edit Product' : 'Create Product'}
                        </CardTitle>
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
                    <CardDescription>{theme.tagline}</CardDescription>
                </CardHeader>
                <form onSubmit={submit}>
                    {Object.keys(errors).length > 0 && (
                        <div className="mx-6 mt-2 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                            <p className="mb-1 font-semibold">
                                Please fix the following errors:
                            </p>
                            <ul className="list-disc pl-5">
                                {Object.entries(errors).map(([key, error]) => (
                                    <li key={key}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <CardContent className="pt-6 pb-6">
                        {/* Settings rail on the left, content on the right —
                            the mirror of the CMS page/post forms, which put
                            their narrow column last. */}
                        <div className="grid items-start gap-8 lg:grid-cols-[21rem_minmax(0,1fr)] lg:gap-10">
                            <div className="grid gap-6">
                                <section
                                    className={cn(
                                        'grid gap-6 rounded-xl border p-5',
                                        theme.fieldset,
                                    )}
                                >
                                    <PanelHeading
                                        theme={theme}
                                        icon={SlidersHorizontal}
                                        title="Setup"
                                        description="How this product behaves and where it appears."
                                    />

                                    {productTypes.length > 0 && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="type">
                                                Product Type
                                            </Label>
                                            <select
                                                id="type"
                                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm ring-offset-background placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
                                                value={data.type}
                                                onChange={(e) =>
                                                    setData(
                                                        'type',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {productTypes.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.type && (
                                                <div className="text-sm font-medium text-destructive">
                                                    {errors.type}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label htmlFor="category_ids">
                                            Categories
                                        </Label>
                                        <CategoryMultiSelect
                                            inputId="category_ids"
                                            categories={categories}
                                            productType={data.type}
                                            value={data.category_ids}
                                            onChange={(ids) =>
                                                setData('category_ids', ids)
                                            }
                                            invalid={Boolean(
                                                errors.category_ids,
                                            )}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Only categories matching the
                                            selected product type are shown.
                                        </p>
                                        {errors.category_ids && (
                                            <div className="text-sm font-medium text-destructive">
                                                {errors.category_ids}
                                            </div>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="grid gap-4">
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

                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="is_visible"
                                                checked={data.is_visible}
                                                onCheckedChange={(checked) =>
                                                    setData(
                                                        'is_visible',
                                                        checked,
                                                    )
                                                }
                                            />
                                            <Label htmlFor="is_visible">
                                                Visible on the storefront
                                            </Label>
                                            {errors.is_visible && (
                                                <div className="ml-2 text-sm font-medium text-destructive">
                                                    {errors.is_visible}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* Main Product Image */}
                                <section className="grid gap-4 rounded-xl border p-5">
                                    <div className="grid gap-2">
                                        <Label htmlFor="image">
                                            Main Product Image
                                        </Label>
                                        <ImageUpload
                                            id="image"
                                            value={data.image}
                                            onChange={(file) =>
                                                setData('image', file)
                                            }
                                            initialPreviewUrl={
                                                product?.image
                                                    ? `/storage/${product.image}`
                                                    : null
                                            }
                                            error={errors.image}
                                            aspectClassName="aspect-4/3"
                                            hint="PNG, JPG or WEBP under 1 MB"
                                        />
                                        {isEditing && product?.image && (
                                            <p className="text-xs text-muted-foreground">
                                                Leave blank to keep the current
                                                image.
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="image_alt">
                                            Hero image alt text
                                        </Label>
                                        <Input
                                            id="image_alt"
                                            value={data.image_alt}
                                            onChange={(e) =>
                                                setData(
                                                    'image_alt',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Defaults to the product title"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Describes the image for screen
                                            readers and social previews.
                                        </p>
                                        {errors.image_alt && (
                                            <div className="text-sm font-medium text-destructive">
                                                {errors.image_alt}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* SEO overrides */}
                                <section className="grid gap-6 rounded-xl border p-5">
                                    <PanelHeading
                                        theme={theme}
                                        icon={Search}
                                        title="SEO"
                                        description="Overrides the metadata generated from the product details."
                                    />

                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label htmlFor="seo_title">
                                                SEO title
                                            </Label>
                                            <CharacterCount
                                                value={data.seo_title}
                                                limit={SEO_TITLE_LIMIT}
                                            />
                                        </div>
                                        <Input
                                            id="seo_title"
                                            value={data.seo_title}
                                            onChange={(e) =>
                                                setData(
                                                    'seo_title',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Defaults to the product title"
                                        />
                                        {errors.seo_title && (
                                            <div className="text-sm font-medium text-destructive">
                                                {errors.seo_title}
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <Label htmlFor="seo_description">
                                                Meta description
                                            </Label>
                                            <CharacterCount
                                                value={data.seo_description}
                                                limit={SEO_DESCRIPTION_LIMIT}
                                            />
                                        </div>
                                        <Textarea
                                            id="seo_description"
                                            value={data.seo_description}
                                            onChange={(e) =>
                                                setData(
                                                    'seo_description',
                                                    e.target.value,
                                                )
                                            }
                                            rows={4}
                                            className="resize-none"
                                            placeholder="Defaults to a summary of the description."
                                        />
                                        {errors.seo_description && (
                                            <div className="text-sm font-medium text-destructive">
                                                {errors.seo_description}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>

                            <div className="grid gap-6">
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

                                <ProductTypeFields
                                    type={data.type}
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                />

                                <div className="grid gap-2">
                                    <Label htmlFor="description">
                                        Description
                                    </Label>
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

                                {/* Members-only description, a digital-product
                                    perk — the backend discards it for other
                                    types, so only show it for digital. */}
                                {data.type === 'digital' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="hidden_description">
                                            Hidden Description
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Only signed-in customers see this on
                                            the product page. Guests, bots, and
                                            search engines never receive it.
                                        </p>
                                        <NovelEditor
                                            initialValue={
                                                data.hidden_description
                                            }
                                            onChange={(html) =>
                                                setData(
                                                    'hidden_description',
                                                    html,
                                                )
                                            }
                                            className="min-h-50"
                                            contentClassName="min-h-25"
                                        />
                                        {errors.hidden_description && (
                                            <div className="text-sm font-medium text-destructive">
                                                {errors.hidden_description}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Product Gallery */}
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <Label>
                                                Product Gallery (Max 6, 1MB
                                                each)
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                Upload and reorder extra images
                                                for the product page.
                                            </p>
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
                                            onClick={() =>
                                                galleryInputRef.current?.click()
                                            }
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
                                            <AttachmentGroup className="grid w-full grid-cols-2 content-start gap-4 pt-2 sm:grid-cols-3 xl:grid-cols-4">
                                                {galleryImages.map(
                                                    (media, index) => (
                                                        <div
                                                            key={
                                                                media.type ===
                                                                'existing'
                                                                    ? `existing-${media.id}`
                                                                    : `new-${index}`
                                                            }
                                                            draggable
                                                            onDragStart={() =>
                                                                handleDragStart(
                                                                    index,
                                                                )
                                                            }
                                                            onDragOver={
                                                                handleDragOver
                                                            }
                                                            onDrop={(e) =>
                                                                handleDrop(
                                                                    e,
                                                                    index,
                                                                )
                                                            }
                                                            className={`relative cursor-grab active:cursor-grabbing ${
                                                                draggedIndex ===
                                                                index
                                                                    ? 'opacity-50'
                                                                    : 'opacity-100'
                                                            }`}
                                                        >
                                                            <Attachment
                                                                size="xs"
                                                                orientation="vertical"
                                                                className="pointer-events-none w-full! min-w-0 has-data-[slot=attachment-content]:w-full!"
                                                            >
                                                                <AttachmentMedia
                                                                    variant="image"
                                                                    className="w-full! rounded-md"
                                                                >
                                                                    <img
                                                                        src={
                                                                            media.type ===
                                                                            'existing'
                                                                                ? media.image_path
                                                                                : media.previewUrl
                                                                        }
                                                                        alt="Gallery preview"
                                                                        loading="lazy"
                                                                    />
                                                                </AttachmentMedia>
                                                            </Attachment>
                                                            <div className="absolute top-1 left-1 rounded-md bg-background/90 p-1 opacity-80 shadow-sm backdrop-blur-sm hover:opacity-100">
                                                                <GripVertical className="size-4" />
                                                            </div>
                                                            <AttachmentActions className="pointer-events-auto absolute top-1 right-1 gap-1 opacity-100">
                                                                <Tooltip>
                                                                    <TooltipTrigger
                                                                        asChild
                                                                    >
                                                                        <AttachmentAction
                                                                            type="button"
                                                                            size="icon"
                                                                            variant="destructive"
                                                                            className="size-7 shadow-sm"
                                                                            onClick={(
                                                                                e,
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                removeImage(
                                                                                    index,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                            <span className="sr-only">
                                                                                Delete
                                                                            </span>
                                                                        </AttachmentAction>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        Delete
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </AttachmentActions>
                                                        </div>
                                                    ),
                                                )}
                                            </AttachmentGroup>
                                        </TooltipProvider>
                                    ) : (
                                        <div className="mt-2 flex min-h-36 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                                            No gallery images uploaded yet.
                                        </div>
                                    )}

                                    {galleryErrorKeys.length > 0 && (
                                        <div className="text-sm font-medium text-destructive">
                                            {galleryErrorKeys.map((key) => (
                                                <div key={key}>
                                                    {
                                                        errors[
                                                            key as keyof typeof errors
                                                        ]
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-2">
                                    <MediaManager />
                                </div>
                            </div>
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
