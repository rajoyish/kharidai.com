import { Link, router } from '@inertiajs/react';
import { GripVertical } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { DragEvent } from 'react';

import {
    create,
    destroy as destroyPage,
    edit,
    index as pagesIndex,
    reorder,
    toggleFooter,
    toggleNav,
} from '@/actions/App/Http/Controllers/Admin/PageController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { TruncatedText } from '@/components/truncated-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { show as showStorefrontPage } from '@/routes/pages';

type CmsPageRow = {
    id: number;
    title: string;
    slug: string;
    image: string | null;
    is_published: boolean;
    published_at: string | null;
    sort_order: number;
    show_in_nav: boolean;
    show_in_footer: boolean;
};

const PAGE_IMAGE_COLUMN_CLASSES = 'w-22 min-w-22 max-w-22 px-4';
const PAGE_STATUS_COLUMN_CLASSES = 'w-33 min-w-33';
const PAGE_HANDLE_COLUMN_CLASSES = 'w-10 min-w-10 max-w-10 px-2';

export default function PagesIndex({ pages }: { pages: CmsPageRow[] }) {
    const [rows, setRows] = useState<CmsPageRow[]>(pages);
    const [syncedPages, setSyncedPages] = useState<CmsPageRow[]>(pages);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [deletingPageId, setDeletingPageId] = useState<number | null>(null);
    /**
     * The page awaiting delete confirmation. One dialog is driven by this value
     * rather than one per row, so the table stays cheap to render.
     */
    const [pageToDelete, setPageToDelete] = useState<CmsPageRow | null>(null);

    // `rows` is optimistic during a drag; re-sync whenever the server sends
    // fresh props (reorder, toggle, delete).
    if (pages !== syncedPages) {
        setSyncedPages(pages);
        setRows(pages);
    }

    const isSearching = searchQuery.trim().length > 0;

    const filteredPages = useMemo(() => {
        if (!isSearching) {
            return rows;
        }

        const query = searchQuery.toLowerCase();

        return rows.filter((page) => page.title.toLowerCase().includes(query));
    }, [rows, searchQuery, isSearching]);

    const handleDragStart = (index: number) => setDraggedIndex(index);

    const handleDragOver = (event: DragEvent) => event.preventDefault();

    const handleDrop = (event: DragEvent, targetIndex: number) => {
        event.preventDefault();

        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);

            return;
        }

        const next = [...rows];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(targetIndex, 0, moved);

        setRows(next);
        setDraggedIndex(null);

        router.patch(
            reorder.url(),
            { ids: next.map((page) => page.id) },
            { preserveScroll: true },
        );
    };

    const handleDelete = (page: CmsPageRow) => {
        setDeletingPageId(page.id);

        router.delete(destroyPage(page).url, {
            preserveScroll: true,
            onFinish: () => {
                setDeletingPageId(null);
            },
        });
    };

    return (
        <>
            <SeoHead title="Pages Management" />

            <PagePanel
                title="Pages"
                variant="transparent"
                description={
                    isSearching
                        ? 'Clear the search to drag pages into a new menu order.'
                        : 'Drag rows to set the order of the navigation and footer menus.'
                }
                actions={
                    <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                        <Input
                            placeholder="Search pages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <Button asChild className="w-fit">
                            <Link href={create()}>Add Page</Link>
                        </Button>
                    </div>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className={PAGE_HANDLE_COLUMN_CLASSES}>
                                <span className="sr-only">Reorder</span>
                            </TableHead>
                            <TableHead className={PAGE_IMAGE_COLUMN_CLASSES}>
                                Image
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead className={PAGE_STATUS_COLUMN_CLASSES}>
                                Status
                            </TableHead>
                            <TableHead className="text-center">Nav</TableHead>
                            <TableHead className="text-center">
                                Footer
                            </TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredPages.map((page, index) => (
                            <TableRow
                                key={page.id}
                                draggable={!isSearching}
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={handleDragOver}
                                onDrop={(event) => handleDrop(event, index)}
                                onDragEnd={() => setDraggedIndex(null)}
                                className={
                                    draggedIndex === index
                                        ? 'opacity-50'
                                        : 'opacity-100'
                                }
                            >
                                <TableCell
                                    className={PAGE_HANDLE_COLUMN_CLASSES}
                                >
                                    <GripVertical
                                        className={`size-4 text-muted-foreground ${
                                            isSearching
                                                ? 'cursor-not-allowed opacity-30'
                                                : 'cursor-grab active:cursor-grabbing'
                                        }`}
                                    />
                                    <span className="sr-only">
                                        Drag to reorder
                                    </span>
                                </TableCell>
                                <TableCell
                                    className={PAGE_IMAGE_COLUMN_CLASSES}
                                >
                                    {page.image ? (
                                        <img
                                            src={page.image}
                                            alt={page.title}
                                            className="h-10 w-10 rounded object-cover shadow-sm"
                                        />
                                    ) : (
                                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                                            <span className="text-xs">
                                                No img
                                            </span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-50 font-medium md:max-w-75">
                                    <TruncatedText>{page.title}</TruncatedText>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    /{page.slug}
                                </TableCell>
                                <TableCell
                                    className={PAGE_STATUS_COLUMN_CLASSES}
                                >
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase ${page.is_published ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                                    >
                                        {page.is_published
                                            ? 'Published'
                                            : 'Draft'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={page.show_in_nav}
                                        onCheckedChange={() =>
                                            router.patch(
                                                toggleNav(page).url,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                        aria-label={`Show ${page.title} in the main navigation`}
                                    />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={page.show_in_footer}
                                        onCheckedChange={() =>
                                            router.patch(
                                                toggleFooter(page).url,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                        aria-label={`Show ${page.title} in the footer`}
                                    />
                                </TableCell>
                                <TableCell className="flex h-18 items-center justify-end gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs hover:bg-muted"
                                        asChild
                                    >
                                        <a
                                            href={showStorefrontPage.url(page)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            View
                                        </a>
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs hover:bg-muted"
                                        asChild
                                    >
                                        <Link href={edit(page)}>Edit</Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                        disabled={deletingPageId === page.id}
                                        onClick={() => setPageToDelete(page)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredPages.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {rows.length === 0
                                        ? 'No pages found.'
                                        : 'No pages match your search.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>

            {pageToDelete && (
                <ConfirmDialog
                    title="Are you sure you want to delete this page?"
                    description={
                        <>
                            This permanently removes &ldquo;{pageToDelete.title}
                            &rdquo; (/{pageToDelete.slug}) and cannot be undone.
                        </>
                    }
                    onConfirm={() => handleDelete(pageToDelete)}
                    onOpenChange={() => setPageToDelete(null)}
                />
            )}
        </>
    );
}

PagesIndex.layout = {
    breadcrumbs: [{ title: 'Pages', href: pagesIndex().url }],
};
