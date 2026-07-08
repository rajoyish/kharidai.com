import { Head, usePage } from '@inertiajs/react';
import type { PageProps } from '@/types';

interface SeoHeadProps {
    title?: string;
    description?: string;
    image?: string;
    imageType?: string;
    imageWidth?: number;
    imageHeight?: number;
    url?: string;
    type?: string;
    robots?: string;
    imageAlt?: string;
    twitterCard?: string;
    updatedTime?: string;
    children?: React.ReactNode;
}

export function SeoHead({
    title,
    description,
    image,
    imageType,
    imageWidth,
    imageHeight,
    url,
    type,
    robots,
    imageAlt,
    twitterCard,
    updatedTime,
    children,
}: SeoHeadProps) {
    const { seo } = usePage<PageProps>().props;

    const pageTitle = title ? `${title} - ${seo.name}` : seo.title;
    const pageDescription = description ?? seo?.description;
    const pageImage = image ?? seo?.image;
    const pageImageType = imageType ?? seo?.imageType;
    const pageImageWidth = imageWidth ?? seo?.imageWidth;
    const pageImageHeight = imageHeight ?? seo?.imageHeight;
    const pageImageAlt = imageAlt ?? seo?.imageAlt;
    const pageUrl = url ?? seo?.url;
    const pageType = type ?? seo?.type ?? 'website';
    const pageRobots = robots ?? seo?.robots;
    const pageTwitterCard =
        twitterCard ?? seo?.twitterCard ?? 'summary_large_image';
    const pageUpdatedTime = updatedTime ?? seo?.updatedTime;

    return (
        <Head>
            <title>{pageTitle}</title>
            {pageDescription && (
                <meta
                    head-key="description"
                    name="description"
                    content={pageDescription}
                />
            )}
            {pageUrl && (
                <link head-key="canonical" rel="canonical" href={pageUrl} />
            )}
            {pageImage && (
                <link head-key="image_src" rel="image_src" href={pageImage} />
            )}
            {pageRobots && (
                <meta head-key="robots" name="robots" content={pageRobots} />
            )}

            {/* Open Graph */}
            <meta
                head-key="og:site_name"
                property="og:site_name"
                content={seo.name}
            />
            <meta head-key="og:title" property="og:title" content={pageTitle} />
            {pageDescription && (
                <meta
                    head-key="og:description"
                    property="og:description"
                    content={pageDescription}
                />
            )}
            {pageImage && (
                <meta
                    head-key="og:image"
                    property="og:image"
                    content={pageImage}
                />
            )}
            {pageImage?.startsWith('https://') && (
                <meta
                    head-key="og:image:secure_url"
                    property="og:image:secure_url"
                    content={pageImage}
                />
            )}
            {pageImageType && (
                <meta
                    head-key="og:image:type"
                    property="og:image:type"
                    content={pageImageType}
                />
            )}
            {pageImageWidth && (
                <meta
                    head-key="og:image:width"
                    property="og:image:width"
                    content={String(pageImageWidth)}
                />
            )}
            {pageImageHeight && (
                <meta
                    head-key="og:image:height"
                    property="og:image:height"
                    content={String(pageImageHeight)}
                />
            )}
            {pageImageAlt && (
                <meta
                    head-key="og:image:alt"
                    property="og:image:alt"
                    content={pageImageAlt}
                />
            )}
            {pageUrl && (
                <meta head-key="og:url" property="og:url" content={pageUrl} />
            )}
            {pageUpdatedTime && (
                <meta
                    head-key="og:updated_time"
                    property="og:updated_time"
                    content={pageUpdatedTime}
                />
            )}
            <meta head-key="og:type" property="og:type" content={pageType} />

            {/* Twitter Card */}
            <meta
                head-key="twitter:card"
                name="twitter:card"
                content={pageTwitterCard}
            />
            <meta
                head-key="twitter:title"
                name="twitter:title"
                content={pageTitle}
            />
            {pageDescription && (
                <meta
                    head-key="twitter:description"
                    name="twitter:description"
                    content={pageDescription}
                />
            )}
            {pageImage && (
                <meta
                    head-key="twitter:image"
                    name="twitter:image"
                    content={pageImage}
                />
            )}
            {pageImageAlt && (
                <meta
                    head-key="twitter:image:alt"
                    name="twitter:image:alt"
                    content={pageImageAlt}
                />
            )}
            {pageUrl && (
                <meta
                    head-key="twitter:url"
                    name="twitter:url"
                    content={pageUrl}
                />
            )}

            {children}
        </Head>
    );
}
