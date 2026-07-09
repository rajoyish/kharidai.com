import { Link, useForm } from '@inertiajs/react';
import {
    FileText,
    ImageUp,
    Maximize2,
    Minimize2,
    Newspaper,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { toast } from 'sonner';

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
import { dateTimeLocalToIso, isoToDateTimeLocal } from '@/lib/datetime-local';
import { slugify } from '@/lib/slugify';
import { cn } from '@/lib/utils';

export const HERO_IMAGE_WIDTH = 1200;
export const HERO_IMAGE_HEIGHT = 630;

const SEO_TITLE_LIMIT = 60;
const SEO_DESCRIPTION_LIMIT = 160;

/**
 * Each resource owns an accent so an admin can tell the two near-identical
 * create screens apart at a glance. Tailwind needs the full class names, so
 * these are spelled out rather than interpolated.
 */
const RESOURCE_ACCENTS = {
    Page: {
        icon: FileText,
        surface: 'border-primary/20 bg-primary/5',
        tile: 'bg-primary text-primary-foreground',
        // The default button variant rests on `accent` (green), which fights
        // the blue page chrome. Pin the submit buttons to `primary` instead.
        submitButton:
            'bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50',
        description: 'Static pages appear in the site navigation and footer.',
    },
    Post: {
        icon: Newspaper,
        surface: 'border-chart-2/25 bg-chart-2/8',
        tile: 'bg-chart-2 text-white',
        submitButton: '',
        description: 'Blog posts are listed at /blog, newest first.',
    },
} as const;

export type CmsRecord = {
    id: number;
    title: string;
    slug: string;
    excerpt?: string | null;
    content: string | null;
    image: string | null;
    image_alt: string | null;
    seo_title: string | null;
    seo_description: string | null;
    is_published: boolean;
    published_at: string | null;
};

type CmsFormProps = {
    submitUrl: string;
    resourceLabel: 'Page' | 'Post';
    cancelUrl: string;
    record?: CmsRecord;
    withExcerpt?: boolean;
};

type FieldProps = {
    htmlFor?: string;
    label: string;
    hint?: ReactNode;
    error?: string;
    children: ReactNode;
    trailing?: ReactNode;
};

/**
 * Rejects hero images that are not exactly 1200x630 before they reach the
 * server, so editors get feedback without a round trip. The server enforces
 * the same rule.
 */
function readImageDimensions(
    file: File,
): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: image.naturalWidth, height: image.naturalHeight });
        };
        image.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Could not read the selected image.'));
        };
        image.src = objectUrl;
    });
}

function Field({
    htmlFor,
    label,
    hint,
    error,
    children,
    trailing,
}: FieldProps) {
    return (
        <div className="grid gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
                <Label htmlFor={htmlFor}>{label}</Label>
                {trailing}
            </div>
            {children}
            {hint && (
                <p className="text-xs leading-5 text-muted-foreground">
                    {hint}
                </p>
            )}
            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
        </div>
    );
}

function CharacterCount({ value, limit }: { value: string; limit: number }) {
    return (
        <span
            className={`text-xs tabular-nums ${
                value.length > limit
                    ? 'text-destructive'
                    : 'text-muted-foreground'
            }`}
        >
            {value.length}/{limit}
        </span>
    );
}

export function CmsForm({
    submitUrl,
    resourceLabel,
    cancelUrl,
    record,
    withExcerpt = false,
}: CmsFormProps) {
    const isEditing = Boolean(record);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(
        record?.image ?? null,
    );
    const [isEditorExpanded, setIsEditorExpanded] = useState(false);

    // An existing slug is already a live URL, so only mirror the title into the
    // slug until the admin edits it themselves.
    const [isSlugLocked, setIsSlugLocked] = useState(Boolean(record?.slug));

    const { data, setData, post, processing, errors, transform } = useForm({
        _method: isEditing ? 'put' : 'post',
        title: record?.title ?? '',
        slug: record?.slug ?? '',
        excerpt: record?.excerpt ?? '',
        content: record?.content ?? '',
        image: null as File | null,
        image_alt: record?.image_alt ?? '',
        seo_title: record?.seo_title ?? '',
        seo_description: record?.seo_description ?? '',
        is_published: record?.is_published ?? false,
        published_at: isoToDateTimeLocal(record?.published_at),
    });

    // `published_at` is edited as local wall time but stored as a UTC instant.
    transform((data) => ({
        ...data,
        published_at: dateTimeLocalToIso(data.published_at),
    }));

    const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        try {
            const { width, height } = await readImageDimensions(file);

            if (width !== HERO_IMAGE_WIDTH || height !== HERO_IMAGE_HEIGHT) {
                toast.error(
                    `Image must be exactly ${HERO_IMAGE_WIDTH}x${HERO_IMAGE_HEIGHT}px. Selected image is ${width}x${height}px.`,
                );

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }

                return;
            }

            setData('image', file);
            setImagePreview(URL.createObjectURL(file));
        } catch {
            toast.error('Could not read the selected image.');
        }
    };

    useEffect(() => {
        if (!isEditorExpanded) {
            return;
        }

        const exitOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsEditorExpanded(false);
            }
        };

        window.addEventListener('keydown', exitOnEscape);

        return () => window.removeEventListener('keydown', exitOnEscape);
    }, [isEditorExpanded]);

    const handleTitleChange = (title: string) => {
        setData((current) => ({
            ...current,
            title,
            slug: isSlugLocked ? current.slug : slugify(title),
        }));
    };

    const handleSlugChange = (slug: string) => {
        setIsSlugLocked(slug.length > 0);
        setData('slug', slug);
    };

    const clearSelectedImage = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setData('image', null);
        setImagePreview(record?.image ?? null);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        post(submitUrl, { forceFormData: true });
    };

    const isPage = resourceLabel === 'Page';
    const accent = RESOURCE_ACCENTS[resourceLabel];
    const ResourceIcon = accent.icon;

    const submitLabel = processing
        ? isEditing
            ? 'Saving...'
            : 'Creating...'
        : isEditing
          ? 'Save changes'
          : `Create ${resourceLabel.toLowerCase()}`;

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div
                    className={cn(
                        'flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between md:p-5',
                        accent.surface,
                    )}
                >
                    <div className="flex items-center gap-4">
                        <span
                            className={cn(
                                'flex size-11 shrink-0 items-center justify-center rounded-lg shadow-sm',
                                accent.tile,
                            )}
                        >
                            <ResourceIcon className="size-5" />
                        </span>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    {isEditing
                                        ? `Edit ${resourceLabel.toLowerCase()}`
                                        : `New ${resourceLabel.toLowerCase()}`}
                                </h1>
                                <Badge
                                    variant={
                                        data.is_published
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {data.is_published ? 'Published' : 'Draft'}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {accent.description}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                        <Button variant="ghost" asChild>
                            <Link href={cancelUrl}>Cancel</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className={accent.submitButton}
                        >
                            {submitLabel}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="flex min-w-0 flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Details</CardTitle>
                                <CardDescription>
                                    The headline and public URL for this{' '}
                                    {resourceLabel.toLowerCase()}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <Field
                                    htmlFor="title"
                                    label="Title"
                                    error={errors.title}
                                >
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) =>
                                            handleTitleChange(e.target.value)
                                        }
                                        placeholder={`An engaging ${resourceLabel.toLowerCase()} title`}
                                        className="md:text-base"
                                        required
                                    />
                                </Field>

                                <Field
                                    htmlFor="slug"
                                    label="Slug"
                                    error={errors.slug}
                                    hint={
                                        isSlugLocked
                                            ? isPage
                                                ? 'Reserved slugs such as "blog" or "admin" are rejected. Clear the field to follow the title again.'
                                                : 'Clear the field to follow the title again.'
                                            : 'Generated from the title as you type. Edit it to set your own.'
                                    }
                                >
                                    <div className="flex items-center rounded-md border bg-muted/40 focus-within:ring-[3px] focus-within:ring-ring/50">
                                        <span className="shrink-0 pl-3 text-sm text-muted-foreground select-none">
                                            {resourceLabel === 'Page'
                                                ? '/'
                                                : '/blog/'}
                                        </span>
                                        <Input
                                            id="slug"
                                            value={data.slug}
                                            onChange={(e) =>
                                                handleSlugChange(e.target.value)
                                            }
                                            placeholder="generated-from-the-title"
                                            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                                        />
                                    </div>
                                </Field>

                                {withExcerpt && (
                                    <Field
                                        htmlFor="excerpt"
                                        label="Excerpt"
                                        error={errors.excerpt}
                                    >
                                        <Textarea
                                            id="excerpt"
                                            value={data.excerpt ?? ''}
                                            onChange={(e) =>
                                                setData(
                                                    'excerpt',
                                                    e.target.value,
                                                )
                                            }
                                            rows={3}
                                            className="resize-none"
                                            placeholder="Short summary shown on the blog index."
                                        />
                                    </Field>
                                )}
                            </CardContent>
                        </Card>

                        <Card
                            className={cn(
                                // `grow` (basis auto) rather than `flex-1`
                                // (basis 0): the card fills the height left over
                                // by the sidebar, but long content still grows
                                // it past that instead of collapsing.
                                'lg:grow',
                                isEditorExpanded &&
                                    'fixed inset-4 z-50 overflow-hidden shadow-2xl',
                            )}
                        >
                            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                                <div className="space-y-1.5">
                                    <CardTitle>Content</CardTitle>
                                    <CardDescription>
                                        Type "/" for formatting commands. Drag
                                        the bottom edge to resize.
                                    </CardDescription>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <MediaManager />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() =>
                                            setIsEditorExpanded(
                                                !isEditorExpanded,
                                            )
                                        }
                                        aria-label={
                                            isEditorExpanded
                                                ? 'Exit full screen'
                                                : 'Expand editor to full screen'
                                        }
                                    >
                                        {isEditorExpanded ? (
                                            <Minimize2 className="size-4" />
                                        ) : (
                                            <Maximize2 className="size-4" />
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent
                                className={cn(
                                    'lg:flex lg:grow lg:flex-col',
                                    isEditorExpanded &&
                                        'flex min-h-0 flex-1 flex-col',
                                )}
                            >
                                <NovelEditor
                                    initialValue={data.content ?? ''}
                                    onChange={(html) =>
                                        setData('content', html)
                                    }
                                    className={cn(
                                        'lg:grow',
                                        isEditorExpanded &&
                                            'h-full min-h-0 flex-1 resize-none',
                                    )}
                                />
                                {errors.content && (
                                    <p className="mt-2 text-xs font-medium text-destructive">
                                        {errors.content}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 lg:sticky lg:top-6 lg:self-start">
                        <Card>
                            <CardHeader>
                                <CardTitle>Publishing</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="is_published">
                                            Published
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Drafts stay hidden.
                                        </p>
                                    </div>
                                    <Switch
                                        id="is_published"
                                        checked={data.is_published}
                                        onCheckedChange={(checked) =>
                                            setData('is_published', checked)
                                        }
                                    />
                                </div>

                                <Field
                                    htmlFor="published_at"
                                    label="Publish date"
                                    error={errors.published_at}
                                    hint="A future date schedules the content. Leave blank to publish immediately."
                                >
                                    <Input
                                        id="published_at"
                                        type="datetime-local"
                                        value={data.published_at ?? ''}
                                        onChange={(e) =>
                                            setData(
                                                'published_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </Field>
                            </CardContent>
                            <CardFooter className="flex-col items-stretch gap-2">
                                <Separator className="mb-2" />
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className={accent.submitButton}
                                >
                                    {submitLabel}
                                </Button>
                            </CardFooter>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Hero image</CardTitle>
                                <CardDescription>
                                    Exactly {HERO_IMAGE_WIDTH}&times;
                                    {HERO_IMAGE_HEIGHT}px.
                                    {isEditing &&
                                        ' Leave blank to keep the current image.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid gap-2.5">
                                    <input
                                        id="hero-image"
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageChange}
                                        className="hidden"
                                        accept="image/*"
                                    />

                                    {imagePreview ? (
                                        <div className="group relative overflow-hidden rounded-lg border">
                                            <img
                                                src={imagePreview}
                                                alt="Hero preview"
                                                className="aspect-1200/630 w-full object-cover"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() =>
                                                        fileInputRef.current?.click()
                                                    }
                                                >
                                                    <ImageUp className="size-4" />
                                                    Replace
                                                </Button>
                                                {data.image && (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={
                                                            clearSelectedImage
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="flex aspect-1200/630 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 text-center transition-colors hover:border-ring hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                        >
                                            <ImageUp className="size-7 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                Choose image
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                PNG or JPG, {HERO_IMAGE_WIDTH}
                                                &times;{HERO_IMAGE_HEIGHT}px
                                            </span>
                                        </button>
                                    )}

                                    {errors.image && (
                                        <p className="text-xs font-medium text-destructive">
                                            {errors.image}
                                        </p>
                                    )}
                                </div>

                                <Field
                                    htmlFor="image_alt"
                                    label="Alt text"
                                    error={errors.image_alt}
                                    hint="Describes the image for screen readers."
                                >
                                    <Input
                                        id="image_alt"
                                        value={data.image_alt ?? ''}
                                        onChange={(e) =>
                                            setData('image_alt', e.target.value)
                                        }
                                    />
                                </Field>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>SEO</CardTitle>
                                <CardDescription>
                                    Overrides the site defaults for search
                                    engines and social previews.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <Field
                                    htmlFor="seo_title"
                                    label="SEO title"
                                    error={errors.seo_title}
                                    trailing={
                                        <CharacterCount
                                            value={data.seo_title ?? ''}
                                            limit={SEO_TITLE_LIMIT}
                                        />
                                    }
                                >
                                    <Input
                                        id="seo_title"
                                        value={data.seo_title ?? ''}
                                        onChange={(e) =>
                                            setData('seo_title', e.target.value)
                                        }
                                        placeholder="Defaults to the title"
                                    />
                                </Field>

                                <Field
                                    htmlFor="seo_description"
                                    label="SEO description"
                                    error={errors.seo_description}
                                    trailing={
                                        <CharacterCount
                                            value={data.seo_description ?? ''}
                                            limit={SEO_DESCRIPTION_LIMIT}
                                        />
                                    }
                                >
                                    <Textarea
                                        id="seo_description"
                                        value={data.seo_description ?? ''}
                                        onChange={(e) =>
                                            setData(
                                                'seo_description',
                                                e.target.value,
                                            )
                                        }
                                        rows={4}
                                        className="resize-none"
                                        placeholder="A one-sentence summary shown in search results."
                                    />
                                </Field>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </form>
    );
}
