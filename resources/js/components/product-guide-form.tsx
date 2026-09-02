import { Link, useForm } from '@inertiajs/react';
import { BookOpen, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
    destroy as destroyGuideMedia,
    index as guideMediaIndex,
    store as storeGuideMedia,
} from '@/actions/App/Http/Controllers/GuideMediaController';
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
import type { MediaEndpoints } from '@/components/ui/media-manager';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * Guide screenshots go to the gated store, never the public blog gallery: the
 * files stay off the `public` disk and each read is checked against the
 * viewer's orders.
 */
const GUIDE_MEDIA_ENDPOINTS: MediaEndpoints = {
    indexUrl: guideMediaIndex.url(),
    storeUrl: storeGuideMedia.url(),
    destroyUrl: (id) => destroyGuideMedia.url(id),
};

export type GuideRecord = {
    id: number;
    title: string;
    content: string | null;
    is_published: boolean;
    sort_order: number;
};

type ProductGuideFormProps = {
    submitUrl: string;
    cancelUrl: string;
    productTitle: string;
    guide?: GuideRecord;
    defaultSortOrder?: number;
};

/**
 * Authoring form for a product's delivery guide.
 *
 * Shares the blog's editor and media gallery, but none of its publishing
 * chrome: a guide has no slug, no hero image and no SEO, because it is never
 * served to a search engine. "Published" here means released to buyers, not
 * public.
 */
export function ProductGuideForm({
    submitUrl,
    cancelUrl,
    productTitle,
    guide,
    defaultSortOrder = 0,
}: ProductGuideFormProps) {
    const isEditing = Boolean(guide);
    const [isEditorExpanded, setIsEditorExpanded] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        _method: isEditing ? 'put' : 'post',
        title: guide?.title ?? '',
        content: guide?.content ?? '',
        is_published: guide?.is_published ?? false,
        sort_order: guide?.sort_order ?? defaultSortOrder,
    });

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

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        post(submitUrl);
    };

    const submitLabel = processing
        ? isEditing
            ? 'Saving...'
            : 'Creating...'
        : isEditing
          ? 'Save changes'
          : 'Create guide';

    return (
        <form onSubmit={handleSubmit} className="w-full">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
                <div className="flex flex-col gap-4 rounded-xl border border-chart-2/25 bg-chart-2/8 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
                    <div className="flex items-center gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-chart-2 text-white shadow-sm">
                            <BookOpen className="size-5" />
                        </span>
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-2xl font-semibold tracking-tight">
                                    {isEditing ? 'Edit guide' : 'New guide'}
                                </h1>
                                <Badge
                                    variant={
                                        data.is_published
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {data.is_published ? 'Released' : 'Draft'}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Read by everyone who buys {productTitle}. Keep
                                per-order logins and links out of it.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                        <Button variant="ghost" asChild>
                            <Link href={cancelUrl}>Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={processing}>
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
                                    The heading buyers see above these steps.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2.5">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={data.title}
                                        onChange={(e) =>
                                            setData('title', e.target.value)
                                        }
                                        placeholder="How to activate your licence"
                                        className="md:text-base"
                                        required
                                    />
                                    {errors.title && (
                                        <p className="text-xs font-medium text-destructive">
                                            {errors.title}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className={cn(
                                'lg:grow',
                                isEditorExpanded &&
                                    'fixed inset-4 z-50 overflow-hidden shadow-2xl',
                            )}
                        >
                            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                                <div className="space-y-1.5">
                                    <CardTitle>Steps</CardTitle>
                                    <CardDescription>
                                        Type "/" for formatting commands.
                                        Screenshots are gated: only buyers of
                                        this product can open them.
                                    </CardDescription>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <MediaManager
                                        endpoints={GUIDE_MEDIA_ENDPOINTS}
                                        label="Guide images"
                                        description="Only buyers of this product can open these."
                                    />
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
                                    uploadUrl={GUIDE_MEDIA_ENDPOINTS.storeUrl}
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
                                <CardTitle>Release</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="is_published">
                                            Released to buyers
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Drafts stay in the admin.
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

                                <div className="grid gap-2.5">
                                    <Label htmlFor="sort_order">Position</Label>
                                    <Input
                                        id="sort_order"
                                        type="number"
                                        min={0}
                                        value={data.sort_order}
                                        onChange={(e) =>
                                            setData(
                                                'sort_order',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        Guides are listed low number first.
                                    </p>
                                    {errors.sort_order && (
                                        <p className="text-xs font-medium text-destructive">
                                            {errors.sort_order}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-lg border border-warning/30 bg-warning/8 p-4 text-xs leading-5 text-muted-foreground">
                                    A guide reaches a buyer only after their
                                    order is paid, and it is the same document
                                    for all of them. Passwords, emails and
                                    activation links belong on the order, under
                                    Digital Delivery.
                                </div>
                            </CardContent>
                            <CardFooter className="flex-col items-stretch gap-2">
                                <Separator className="mb-2" />
                                <Button type="submit" disabled={processing}>
                                    {submitLabel}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </form>
    );
}
