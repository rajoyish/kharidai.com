import { Link } from '@inertiajs/react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { CmsContent } from '@/components/cms-content';
import { shouldOpenLightboxFromClick } from '@/components/lightbox-image-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { collectGuideImages } from '@/lib/guide-images';
import { cn } from '@/lib/utils';

const ImageLightbox = lazy(() => import('@/components/image-lightbox'));

export type DeliveryGuide = {
    id: number;
    title: string;
    content: string | null;
    is_published: boolean;
};

/** The slice of an order item this component reads. */
export type GuidedOrderItem = {
    delivery_guides: DeliveryGuide[];
    product_variant: {
        product: {
            title: string;
            slug?: string | null;
        };
    };
};

type DeliveryGuidesProps = {
    items: GuidedOrderItem[];
    /** Admin view: label unreleased guides and link out to the editor. */
    showStatus?: boolean;
    /** Given a product slug, where the admin edits that product's guides. */
    manageHref?: (slug: string) => string;
};

type GuideGroup = {
    productTitle: string;
    productSlug: string | null;
    guides: DeliveryGuide[];
};

/**
 * Groups the guides by product, keeping the order the items arrive in.
 *
 * Two items can carry the same product — different variants of it — and both
 * would then repeat the whole guide. Dedupe on guide id so the buyer reads each
 * set of steps once.
 */
function groupByProduct(items: GuidedOrderItem[]): GuideGroup[] {
    const groups: GuideGroup[] = [];
    const seenGuideIds = new Set<number>();

    for (const item of items) {
        const unseen = item.delivery_guides.filter(
            (guide) => !seenGuideIds.has(guide.id),
        );

        if (unseen.length === 0) {
            continue;
        }

        unseen.forEach((guide) => seenGuideIds.add(guide.id));

        groups.push({
            productTitle: item.product_variant.product.title,
            productSlug: item.product_variant.product.slug ?? null,
            guides: unseen,
        });
    }

    return groups;
}

function GuideCard({
    guide,
    defaultOpen,
    showStatus,
}: {
    guide: DeliveryGuide;
    defaultOpen: boolean;
    showStatus: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const images = useMemo(
        () => collectGuideImages(guide.content),
        [guide.content],
    );

    /*
     * Rendered in place of every `<img>` in the body. The anchor keeps the raw
     * image one middle-click away and gives keyboard users something focusable,
     * while a plain left click opens the gallery instead of navigating.
     */
    const GuideImage = useCallback(
        ({ src, alt, ...props }: ComponentPropsWithoutRef<'img'>) => {
            const index = images.indexOf(String(src));

            return (
                <a
                    href={String(src)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${alt || 'guide image'} full screen`}
                    className="block cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={(event) => {
                        if (!shouldOpenLightboxFromClick(event)) {
                            return;
                        }

                        event.preventDefault();
                        setLightboxIndex(index === -1 ? 0 : index);
                    }}
                >
                    <img
                        {...props}
                        src={src}
                        alt={alt ?? ''}
                        loading="lazy"
                        decoding="async"
                    />
                </a>
            );
        },
        [images],
    );

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="overflow-hidden rounded-lg border bg-card"
        >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{guide.title}</span>
                    {showStatus && !guide.is_published && (
                        <Badge variant="secondary">Draft</Badge>
                    )}
                </span>
                <ChevronDown
                    className={cn(
                        'size-4 shrink-0 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180',
                    )}
                />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="border-t px-4 py-4">
                    {guide.content ? (
                        <CmsContent
                            content={guide.content}
                            className="prose-sm"
                            imageComponent={GuideImage}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            This guide has no steps yet.
                        </p>
                    )}
                </div>
            </CollapsibleContent>

            {lightboxIndex !== null && (
                <Suspense fallback={null}>
                    <ImageLightbox
                        open
                        close={() => setLightboxIndex(null)}
                        index={lightboxIndex}
                        slides={images.map((src) => ({ src }))}
                    />
                </Suspense>
            )}
        </Collapsible>
    );
}

/**
 * The reusable half of digital delivery: the same instructions every buyer of a
 * product reads. The per-order half — logins, activation links — lives in the
 * Digital Delivery panel above this one.
 *
 * The server decides what belongs here. A customer is handed guides only for a
 * paid order, and never a draft; this component renders whatever arrives.
 */
export function DeliveryGuides({
    items,
    showStatus = false,
    manageHref,
}: DeliveryGuidesProps) {
    const groups = groupByProduct(items);

    if (groups.length === 0) {
        return null;
    }

    return (
        <div className="rounded-xl border bg-card p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                    <BookOpen className="size-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Setup guides</h2>
                </div>
            </div>

            <div className="space-y-6">
                {groups.map((group) => (
                    <div key={group.productTitle} className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-muted-foreground">
                                {group.productTitle}
                            </p>
                            {manageHref && group.productSlug && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    asChild
                                >
                                    <Link href={manageHref(group.productSlug)}>
                                        Manage guides
                                    </Link>
                                </Button>
                            )}
                        </div>
                        {group.guides.map((guide, index) => (
                            <GuideCard
                                key={guide.id}
                                guide={guide}
                                defaultOpen={index === 0}
                                showStatus={showStatus}
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
