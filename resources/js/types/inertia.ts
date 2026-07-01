import type { Auth } from './auth';

export type SeoData = {
    name: string;
    title: string;
    description: string;
    image: string;
    imageAlt: string;
    url: string;
    type: string;
    robots: string;
    twitterCard: string;
};

export type SharedData = {
    name: string;
    auth: Auth;
    cartCount: number;
    sidebarOpen: boolean;
    seo: SeoData;
};

export type PageProps = SharedData & {
    [key: string]: unknown;
};
