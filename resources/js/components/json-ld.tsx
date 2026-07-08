import { usePage } from '@inertiajs/react';
import React from 'react';

interface JsonLdProps {
    data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

// Helper to generate Organization Schema
export function useOrganizationSchema() {
    const { seo } = usePage().props as any;

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: seo?.name || 'Kharidai',
        url: seo?.url,
        logo: seo?.image,
        sameAs: [
            // Add social URLs here
        ],
    };
}

// Helper to generate BreadcrumbList Schema
export function generateBreadcrumbSchema(
    items: { name: string; url: string }[],
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };
}

// Helper to generate Article Schema (E-E-A-T optimized)
export function generateArticleSchema({
    headline,
    image,
    datePublished,
    dateModified,
    authorName,
    authorUrl,
}: {
    headline: string;
    image: string[];
    datePublished: string;
    dateModified: string;
    authorName: string;
    authorUrl?: string;
}) {
    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline,
        image,
        datePublished,
        dateModified,
        author: {
            '@type': 'Person',
            name: authorName,
            url: authorUrl,
        },
    };
}

// Helper to generate FAQ Schema
export function generateFAQSchema(
    faqs: { question: string; answer: string }[],
) {
    return {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
            },
        })),
    };
}
