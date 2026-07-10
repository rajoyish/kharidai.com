import { Link } from '@inertiajs/react';
import React from 'react';

import { CmsContent } from '@/components/cms-content';
import { JsonLd } from '@/components/json-ld';
import { OptimizedImage } from '@/components/optimized-image';
import { SeoHead } from '@/components/seo-head';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import { home } from '@/routes';
import { index as blogIndex } from '@/routes/blog';

type Post = {
    title: string;
    slug: string;
    excerpt: string | null;
    content: string | null;
    image: string | null;
    image_alt: string;
    author: string | null;
    published_at: string | null;
    updated_at: string | null;
    read_time: number;
    seo_title: string | null;
    seo_description: string | null;
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

function MetaSeparator() {
    return (
        <span
            aria-hidden="true"
            className="inline-block size-1.5 shrink-0 bg-blue-700 dark:bg-blue-400"
        />
    );
}

export default function BlogShow({ post }: { post: Post }) {
    const publishedDate = formatPublishedDate(post.published_at);

    return (
        <>
            <SeoHead
                title={post.seo_title ?? post.title}
                description={post.seo_description ?? post.excerpt ?? undefined}
                image={post.image ?? undefined}
                imageAlt={post.image_alt}
                imageWidth={post.image ? HERO_IMAGE_WIDTH : undefined}
                imageHeight={post.image ? HERO_IMAGE_HEIGHT : undefined}
                type="article"
                updatedTime={post.updated_at ?? undefined}
            />

            <JsonLd
                data={{
                    '@context': 'https://schema.org',
                    '@type': 'BlogPosting',
                    headline: post.title,
                    image: post.image ? [post.image] : undefined,
                    datePublished: post.published_at,
                    dateModified: post.updated_at,
                    author: post.author
                        ? { '@type': 'Person', name: post.author }
                        : undefined,
                }}
            />

            <main className="flex-1">
                <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
                    <Breadcrumb className="mb-6">
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={home()}>Home</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={blogIndex()}>Blog</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <h1 className="text-4xl leading-[1.2] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                        {post.title}
                    </h1>

                    <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold text-blue-700 sm:text-base dark:text-blue-400">
                        {post.author && <span>Written by {post.author}</span>}
                        {post.author && publishedDate && <MetaSeparator />}
                        {publishedDate && (
                            <time dateTime={post.published_at ?? undefined}>
                                {publishedDate}
                            </time>
                        )}
                        {(post.author || publishedDate) && <MetaSeparator />}
                        <span>{post.read_time} min read</span>
                    </div>

                    {post.image && (
                        <OptimizedImage
                            src={post.image}
                            alt={post.image_alt}
                            width={HERO_IMAGE_WIDTH}
                            height={HERO_IMAGE_HEIGHT}
                            priority
                            className="mt-8 aspect-1200/630 w-full rounded-2xl sm:mt-10 sm:rounded-3xl"
                        />
                    )}

                    <CmsContent content={post.content} className="mt-10" />
                </article>
            </main>
        </>
    );
}

BlogShow.layout = (page: React.ReactNode) => (
    <StorefrontLayout>{page}</StorefrontLayout>
);
