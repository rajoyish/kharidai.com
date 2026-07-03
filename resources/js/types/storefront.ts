export type StorefrontVariant = {
    id: number;
    name: string;
    price_npr: string;
    details?: string | null;
};

export type StorefrontProduct = {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    image: string | null;
    variants: StorefrontVariant[];
};

export type StorefrontCategory = {
    id: number;
    name: string;
    slug: string;
    products: StorefrontProduct[];
};

export type StorefrontCategorySummary = {
    id: number;
    name: string;
    slug: string;
    product_count: number;
};

export type StorefrontNavigationCategory = {
    id: number;
    name: string;
    slug: string;
};

export type StorefrontNavigationData = {
    categories: StorefrontNavigationCategory[];
};
