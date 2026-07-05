import { StorefrontTypePage } from '@/components/storefront-type-page';
import { StorefrontLayout } from '@/layouts/storefront-layout';
import type { StorefrontCategory, StorefrontProduct } from '@/types';

export default function PhysicalProducts(props: {
    type: 'physical';
    label: string;
    tagline: string;
    categories: StorefrontCategory[];
    uncategorizedProducts: StorefrontProduct[];
}) {
    return <StorefrontTypePage {...props} />;
}

PhysicalProducts.layout = (page: React.ReactNode) => (
    <StorefrontLayout className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_36%,#ffffff_100%)] text-foreground">
        {page}
    </StorefrontLayout>
);
