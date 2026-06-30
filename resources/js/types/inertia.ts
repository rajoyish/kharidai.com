import type { Auth } from './auth';

export type SeoData = {
    name: string;
    description: string;
    image: string;
    url: string;
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
