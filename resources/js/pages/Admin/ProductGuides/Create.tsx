import { index as productsIndex } from '@/actions/App/Http/Controllers/Admin/ProductController';
import {
    index as guidesIndex,
    store,
} from '@/actions/App/Http/Controllers/Admin/ProductGuideController';
import { PagePanel } from '@/components/page-panel';
import { ProductGuideForm } from '@/components/product-guide-form';
import { SeoHead } from '@/components/seo-head';

type Product = {
    id: number;
    title: string;
    slug: string | null;
};

export default function CreateProductGuide({
    product,
    nextSortOrder,
}: {
    product: Product;
    nextSortOrder: number;
}) {
    return (
        <>
            <SeoHead title={`New guide - ${product.title}`} />

            <PagePanel variant="transparent">
                <ProductGuideForm
                    submitUrl={store.url(product.slug ?? String(product.id))}
                    cancelUrl={guidesIndex.url(
                        product.slug ?? String(product.id),
                    )}
                    productTitle={product.title}
                    defaultSortOrder={nextSortOrder}
                />
            </PagePanel>
        </>
    );
}

CreateProductGuide.layout = {
    breadcrumbs: [
        { title: 'Products', href: productsIndex().url },
        { title: 'Guides', href: '#' },
        { title: 'Create', href: '#' },
    ],
};
