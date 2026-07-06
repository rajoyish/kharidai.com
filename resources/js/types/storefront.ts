export type StorefrontVariant = {
    id: number;
    name: string;
    price_npr: string;
    details?: string | null;
};

export type StorefrontType = 'digital' | 'physical' | 'service';

export type StorefrontProduct = {
    id: number;
    type?: StorefrontType;
    title: string;
    slug: string;
    description: string | null;
    image: string | null;
    /**
     * Lowest variant price in paisa (1/100 NPR), aggregated in the database via
     * `withMin`. Used to render the "Starting at" price without exposing the
     * individual variant rows — which stay protected for digital products.
     */
    starting_price_cents?: number | null;
    /** Number of variants, aggregated via `withCount` for storefront tallies. */
    variants_count?: number;
};

export type StorefrontCategory = {
    id: number;
    name: string;
    slug: string;
    products: StorefrontProduct[];
    children?: StorefrontCategory[];
};

/**
 * A single product-type slice of the storefront — its typed category tree and
 * any type-scoped products that are not assigned to a category. Powers both the
 * homepage sections and the dedicated `/digital-products`, `/physical-products`
 * and `/services` pages.
 */
export type StorefrontSection = {
    type: StorefrontType;
    label: string;
    tagline: string;
    categories: StorefrontCategory[];
    uncategorizedProducts: StorefrontProduct[];
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
    children?: StorefrontNavigationCategory[];
};

export type StorefrontNavigationGroupType =
    | 'digital'
    | 'physical'
    | 'service'
    | 'more';

export type StorefrontNavigationGroup = {
    type: StorefrontNavigationGroupType;
    label: string;
    categories: StorefrontNavigationCategory[];
};

export type StorefrontNavigationData = {
    groups: StorefrontNavigationGroup[];
};
