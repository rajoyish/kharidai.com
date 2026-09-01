import { Link } from '@inertiajs/react';
import React from 'react';

import { OptimizedImage } from '@/components/optimized-image';
import { SeoHead } from '@/components/seo-head';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import { show as blogShow } from '@/routes/blog';

type PostListItem = {
    title: string;
    slug: string;
    excerpt: string | null;
    image: string | null;
    image_alt: string;
    author: string | null;
    published_at: string | null;
    read_time: number;
};

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

const HERO_IMAGE_WIDTH = 1200;
const HERO_IMAGE_HEIGHT = 630;

function formatPublishedDate(date: string | null): string | null {
    if (!date) {
        return null;
    }

    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

function PostCard({ post }: { post: PostListItem }) {
    const publishedDate = formatPublishedDate(post.published_at);

    return (
        <article className="group flex flex-col">
            <Link
                href={blogShow(post.slug)}
                className="block overflow-hidden rounded-2xl border border-border bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
                {post.image ? (
                    <OptimizedImage
                        src={post.image}
                        alt={post.image_alt}
                        width={HERO_IMAGE_WIDTH}
                        height={HERO_IMAGE_HEIGHT}
                        className="aspect-1200/630 w-full transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                ) : (
                    <div className="flex aspect-1200/630 w-full items-center justify-center text-sm text-muted-foreground">
                        No image
                    </div>
                )}
            </Link>

            <div className="mt-4 flex flex-1 flex-col">
                <h2 className="text-xl font-bold tracking-tight text-balance">
                    <Link
                        href={blogShow(post.slug)}
                        className="hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                        {post.title}
                    </Link>
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {post.author && <span>{post.author}</span>}
                    {post.author && publishedDate && (
                        <span
                            aria-hidden="true"
                            className="inline-block size-1.5 bg-blue-700 dark:bg-blue-400"
                        />
                    )}
                    {publishedDate && (
                        <time dateTime={post.published_at ?? undefined}>
                            {publishedDate}
                        </time>
                    )}
                    <span
                        aria-hidden="true"
                        className="inline-block size-1.5 bg-blue-700 dark:bg-blue-400"
                    />
                    <span>{post.read_time} min read</span>
                </div>

                {post.excerpt && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                        {post.excerpt}
                    </p>
                )}
            </div>
        </article>
    );
}

export default function BlogIndex({
    posts,
}: {
    posts: Paginator<PostListItem>;
}) {
    return (
        <>
            <SeoHead
                title="Blog"
                description="News, guides, and updates from the Kharidai team."
            />

            <main className="flex-1">
                <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
                    <header className="max-w-2xl">
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                            Blog
                        </h1>
                        <p className="mt-3 text-muted-foreground">
                            News, guides, and updates from the Kharidai team.
                        </p>
                    </header>

                    {posts.data.length === 0 ? (
                        <div className="mt-10 flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                            No posts published yet.
                        </div>
                    ) : (
                        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                            {posts.data.map((post) => (
                                <PostCard key={post.slug} post={post} />
                            ))}
                        </div>
                    )}

                    {posts.links.length > 3 && (
                        <nav
                            aria-label="Blog pagination"
                            className="mt-12 flex flex-wrap justify-center gap-2"
                        >
                            {posts.links.map((link) =>
                                link.url ? (
                                    <Link
                                        key={link.label}
                                        href={link.url}
                                        aria-current={
                                            link.active ? 'page' : undefined
                                        }
                                        className={
                                            link.active
                                                ? 'rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground'
                                                : 'rounded-md border px-3 py-1.5 text-sm hover:bg-accent-surface'
                                        }
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ) : (
                                    <span
                                        key={link.label}
                                        className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground opacity-50"
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ),
                            )}
                        </nav>
                    )}
                </div>
            </main>
        </>
    );
}

BlogIndex.layout = (page: React.ReactNode) => (
    <StorefrontLayout>{page}</StorefrontLayout>
);
