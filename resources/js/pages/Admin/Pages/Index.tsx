import { Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import {
    create,
    destroy as destroyPage,
    edit,
    index as pagesIndex,
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
    show_in_nav: boolean;
    show_in_footer: boolean;
};

const PAGE_IMAGE_COLUMN_CLASSES = 'w-22 min-w-22 max-w-22 px-4';
const PAGE_STATUS_COLUMN_CLASSES = 'w-33 min-w-33';

export default function PagesIndex({ pages }: { pages: CmsPageRow[] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingPageId, setDeletingPageId] = useState<number | null>(null);
    /**
     * The page awaiting delete confirmation. One dialog is driven by this value
     * rather than one per row, so the table stays cheap to render.
     */
    const [pageToDelete, setPageToDelete] = useState<CmsPageRow | null>(null);

    const isSearching = searchQuery.trim().length > 0;

    const filteredPages = useMemo(() => {
        if (!isSearching) {
            return pages;
        }

        const query = searchQuery.toLowerCase();

        return pages.filter((page) => page.title.toLowerCase().includes(query));
    }, [pages, searchQuery, isSearching]);

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
                description="Content pages. Their order in the header and footer is set in the menu builder."
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
                        {filteredPages.map((page) => (
                            <TableRow key={page.id}>
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
                                    colSpan={7}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {pages.length === 0
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
