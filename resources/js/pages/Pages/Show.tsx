import { Link } from '@inertiajs/react';
import React from 'react';

import { CmsContent } from '@/components/cms-content';
import { OptimizedImage } from '@/components/optimized-image';
import { SeoHead } from '@/components/seo-head';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import { home } from '@/routes';

type CmsPage = {
    title: string;
    slug: string;
    content: string | null;
    image: string | null;
    image_alt: string | null;
    seo_title: string | null;
    seo_description: string | null;
    updated_at: string | null;
};

const HERO_IMAGE_WIDTH = 1200;
const HERO_IMAGE_HEIGHT = 630;

export default function PageShow({ page }: { page: CmsPage }) {
    return (
        <>
            <SeoHead
                title={page.seo_title ?? page.title}
                description={page.seo_description ?? undefined}
                image={page.image ?? undefined}
                imageAlt={page.image_alt ?? page.title}
                imageWidth={page.image ? HERO_IMAGE_WIDTH : undefined}
                imageHeight={page.image ? HERO_IMAGE_HEIGHT : undefined}
                type="article"
                updatedTime={page.updated_at ?? undefined}
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
                                <BreadcrumbPage>{page.title}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <h1 className="text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl">
                        {page.title}
                    </h1>

                    {page.image && (
                        <OptimizedImage
                            src={page.image}
                            alt={page.image_alt ?? page.title}
                            width={HERO_IMAGE_WIDTH}
                            height={HERO_IMAGE_HEIGHT}
                            priority
                            className="mt-8 aspect-1200/630 w-full rounded-2xl sm:mt-10 sm:rounded-3xl"
                        />
                    )}

                    <CmsContent content={page.content} className="mt-10" />
                </article>
            </main>
        </>
    );
}

PageShow.layout = (page: React.ReactNode) => (
    <StorefrontLayout>{page}</StorefrontLayout>
);
