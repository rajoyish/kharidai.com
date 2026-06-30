import { Head, usePage } from '@inertiajs/react';

interface SeoHeadProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    children?: React.ReactNode;
}

export function SeoHead({
    title,
    description,
    image,
    url,
    type = 'website',
    children,
}: SeoHeadProps) {
    const { seo } = usePage().props as any;

    const pageTitle = title ? `${title} - ${seo?.name || 'Kharidai'}` : seo?.name || 'Kharidai';
    const pageDescription = description || seo?.description;
    const pageImage = image || seo?.image;
    const pageUrl = url || seo?.url;

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

            {/* Open Graph */}
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
            {pageUrl && (
                <meta head-key="og:url" property="og:url" content={pageUrl} />
            )}
            <meta head-key="og:type" property="og:type" content={type} />

            {/* Twitter Card */}
            <meta
                head-key="twitter:card"
                name="twitter:card"
                content="summary_large_image"
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

            {children}
        </Head>
    );
}
