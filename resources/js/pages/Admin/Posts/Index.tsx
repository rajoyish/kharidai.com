import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

import {
    create,
    destroy as destroyPost,
    edit,
    index as postsIndex,
} from '@/actions/App/Http/Controllers/Admin/PostController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { TruncatedText } from '@/components/truncated-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { show as showStorefrontPost } from '@/routes/blog';

type PostRow = {
    id: number;
    title: string;
    slug: string;
    image: string | null;
    author: string | null;
    is_published: boolean;
    published_at: string | null;
};

const POST_IMAGE_COLUMN_CLASSES = 'w-22 min-w-22 max-w-22 px-4';
const POST_STATUS_COLUMN_CLASSES = 'w-33 min-w-33';

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

export default function PostsIndex({
    posts,
    filters,
}: {
    posts: Paginator<PostRow>;
    filters: { search?: string };
}) {
    const [searchQuery, setSearchQuery] = useState(filters?.search ?? '');
    const [deletingPostId, setDeletingPostId] = useState<number | null>(null);
    /**
     * The post awaiting delete confirmation. One dialog is driven by this value
     * rather than one per row, so the table stays cheap to render.
     */
    const [postToDelete, setPostToDelete] = useState<PostRow | null>(null);

    useEffect(() => {
        // Skip when the input already matches the server-side filter, so the
        // initial mount (and search-driven reloads) don't refetch page one.
        if (searchQuery === (filters?.search ?? '')) {
            return;
        }

        const timeout = setTimeout(() => {
            router.get(
                postsIndex().url,
                searchQuery ? { search: searchQuery } : {},
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchQuery, filters?.search]);

    const handleDelete = (post: PostRow) => {
        setDeletingPostId(post.id);

        router.delete(destroyPost(post).url, {
            preserveScroll: true,
            onFinish: () => {
                setDeletingPostId(null);
            },
        });
    };

    return (
        <>
            <SeoHead title="Blog Management" />

            <PagePanel
                title="Blog Posts"
                variant="transparent"
                actions={
                    <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                        <Input
                            placeholder="Search posts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <Button asChild className="w-fit">
                            <Link href={create()}>Add Post</Link>
                        </Button>
                    </div>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className={POST_IMAGE_COLUMN_CLASSES}>
                                Image
                            </TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead className={POST_STATUS_COLUMN_CLASSES}>
                                Status
                            </TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posts.data.map((post) => (
                            <TableRow key={post.id}>
                                <TableCell
                                    className={POST_IMAGE_COLUMN_CLASSES}
                                >
                                    {post.image ? (
                                        <img
                                            src={post.image}
                                            alt={post.title}
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
                                <TableCell className="max-w-50 font-medium md:max-w-75 lg:max-w-100">
                                    <TruncatedText>{post.title}</TruncatedText>
                                </TableCell>
                                <TableCell>
                                    {post.author ?? (
                                        <span className="text-xs text-muted-foreground italic">
                                            Unknown
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell
                                    className={POST_STATUS_COLUMN_CLASSES}
                                >
                                    <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase ${post.is_published ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}
                                    >
                                        {post.is_published
                                            ? 'Published'
                                            : 'Draft'}
                                    </span>
                                </TableCell>
                                <TableCell className="flex h-18 items-center justify-end gap-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2 text-xs hover:bg-muted"
                                        asChild
                                    >
                                        <a
                                            href={showStorefrontPost.url(post)}
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
                                        <Link href={edit(post)}>Edit</Link>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                                        disabled={deletingPostId === post.id}
                                        onClick={() => setPostToDelete(post)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {posts.data.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {searchQuery.trim()
                                        ? 'No posts match your search.'
                                        : 'No posts found.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {posts.links && posts.links.length > 3 && (
                    <div className="flex items-center justify-center p-4">
                        <nav className="flex items-center gap-1">
                            {posts.links.map((link, i) =>
                                link.url ? (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`rounded-md px-3 py-1 text-sm ${link.active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ) : (
                                    <span
                                        key={i}
                                        className="px-3 py-1 text-sm text-muted-foreground opacity-50"
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ),
                            )}
                        </nav>
                    </div>
                )}
            </PagePanel>

            {postToDelete && (
                <ConfirmDialog
                    title="Are you sure you want to delete this post?"
                    description={
                        <>
                            This permanently removes &ldquo;{postToDelete.title}
                            &rdquo; and cannot be undone.
                        </>
                    }
                    onConfirm={() => handleDelete(postToDelete)}
                    onOpenChange={() => setPostToDelete(null)}
                />
            )}
        </>
    );
}

PostsIndex.layout = {
    breadcrumbs: [{ title: 'Blog Posts', href: postsIndex().url }],
};
