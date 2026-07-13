import type { Auth } from './auth';
import type { StorefrontNavigationData } from './storefront';

export type SeoData = {
    name: string;
    title: string;
    description: string;
    image: string;
    imageAlt: string;
    imageType?: string | null;
    imageWidth?: number | null;
    imageHeight?: number | null;
    url: string;
    type: string;
    robots: string;
    twitterCard: string;
    updatedTime?: string | null;
    /**
     * Structured data for this page. Rendered server-side into the document
     * head by the root Blade template, so nothing on the client reads it.
     */
    jsonLd?: Record<string, unknown>[];
};

export type SharedData = {
    name: string;
    auth: Auth;
    cartCount: number;
    requiresMobileNumber: boolean;
    sidebarOpen: boolean;
    seo: SeoData;
    storefront: StorefrontNavigationData;
};

export type PageProps = SharedData & {
    [key: string]: unknown;
};
