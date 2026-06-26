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
            {pageDescription && <meta name="description" content={pageDescription} />}
            {pageUrl && <link rel="canonical" href={pageUrl} />}

            {/* Open Graph */}
            <meta property="og:title" content={pageTitle} />
            {pageDescription && <meta property="og:description" content={pageDescription} />}
            {pageImage && <meta property="og:image" content={pageImage} />}
            {pageUrl && <meta property="og:url" content={pageUrl} />}
            <meta property="og:type" content={type} />

            {/* Twitter Card */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            {pageDescription && <meta name="twitter:description" content={pageDescription} />}
            {pageImage && <meta name="twitter:image" content={pageImage} />}

            {children}
        </Head>
    );
}
