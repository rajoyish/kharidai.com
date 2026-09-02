import { Link, router } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import { useState } from 'react';

import { index as productsIndex } from '@/actions/App/Http/Controllers/Admin/ProductController';
import {
    create as createGuide,
    destroy as destroyGuide,
    edit as editGuide,
} from '@/actions/App/Http/Controllers/Admin/ProductGuideController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Product = {
    id: number;
    title: string;
    slug: string | null;
};

type Guide = {
    id: number;
    title: string;
    is_published: boolean;
    sort_order: number;
    updated_at: string | null;
};

export default function ProductGuidesIndex({
    product,
    guides,
}: {
    product: Product;
    guides: Guide[];
}) {
    const productKey = product.slug ?? String(product.id);
    const [guideToDelete, setGuideToDelete] = useState<Guide | null>(null);

    return (
        <>
            <SeoHead title={`Guides - ${product.title}`} />

            <PagePanel
                eyebrow="Delivery Guides"
                title={product.title}
                description="Step-by-step instructions every buyer of this product reads after their order is paid."
                variant="transparent"
                actions={
                    <Button asChild>
                        <Link href={createGuide.url(productKey)}>
                            Add Guide
                        </Link>
                    </Button>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-20">Position</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last updated</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {guides.map((guide) => (
                            <TableRow key={guide.id}>
                                <TableCell className="text-muted-foreground tabular-nums">
                                    {guide.sort_order}
                                </TableCell>
                                <TableCell className="font-medium">
                                    {guide.title}
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        variant={
                                            guide.is_published
                                                ? 'default'
                                                : 'secondary'
                                        }
                                    >
                                        {guide.is_published
                                            ? 'Released'
                                            : 'Draft'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {guide.updated_at
                                        ? new Date(
                                              guide.updated_at,
                                          ).toLocaleDateString()
                                        : '—'}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link
                                            href={editGuide.url({
                                                product: productKey,
                                                guide,
                                            })}
                                        >
                                            Edit
                                        </Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setGuideToDelete(guide)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {guides.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-40">
                                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                                        <BookOpen className="size-6 text-muted-foreground" />
                                        <p className="font-medium">
                                            No guides yet
                                        </p>
                                        <p className="max-w-sm text-sm text-muted-foreground">
                                            Write the instructions once here and
                                            every buyer of this product will
                                            read them on their own order.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>

            {guideToDelete !== null && (
                <ConfirmDialog
                    title={`Delete "${guideToDelete.title}"?`}
                    description="Every buyer of this product loses access to these steps. This cannot be undone."
                    confirmLabel="Delete guide"
                    onConfirm={() =>
                        router.delete(
                            destroyGuide.url({
                                product: productKey,
                                guide: guideToDelete,
                            }),
                            { preserveScroll: true },
                        )
                    }
                    onOpenChange={() => setGuideToDelete(null)}
                />
            )}
        </>
    );
}

ProductGuidesIndex.layout = {
    breadcrumbs: [
        { title: 'Products', href: productsIndex().url },
        { title: 'Guides', href: '#' },
    ],
};
