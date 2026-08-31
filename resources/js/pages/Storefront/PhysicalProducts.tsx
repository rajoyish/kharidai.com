import { StorefrontTypePage } from '@/components/storefront-type-page';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import type { StorefrontCategory, StorefrontProduct } from '@/types';

export default function PhysicalProducts(props: {
    type: 'physical';
    label: string;
    tagline: string;
    categories: StorefrontCategory[];
    uncategorizedProducts: StorefrontProduct[];
    filters: { search: string | null };
}) {
    return <StorefrontTypePage {...props} />;
}

PhysicalProducts.layout = (page: React.ReactNode) => (
    <StorefrontLayout className="min-h-screen storefront-canvas text-foreground">
        {page}
    </StorefrontLayout>
);
