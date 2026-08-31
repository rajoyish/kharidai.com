import { StorefrontTypePage } from '@/components/storefront-type-page';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import type { StorefrontCategory, StorefrontProduct } from '@/types';

export default function DigitalProducts(props: {
    type: 'digital';
    label: string;
    tagline: string;
    categories: StorefrontCategory[];
    uncategorizedProducts: StorefrontProduct[];
    filters: { search: string | null };
}) {
    return <StorefrontTypePage {...props} />;
}

DigitalProducts.layout = (page: React.ReactNode) => (
    <StorefrontLayout className="min-h-screen storefront-canvas text-foreground">
        {page}
    </StorefrontLayout>
);
