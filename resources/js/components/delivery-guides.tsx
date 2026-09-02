import { Link } from '@inertiajs/react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { CmsContent } from '@/components/cms-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

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
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground italic">
                            This guide has no steps yet.
                        </p>
                    )}
                </div>
            </CollapsibleContent>
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
