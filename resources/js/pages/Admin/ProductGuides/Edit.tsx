import { index as productsIndex } from '@/actions/App/Http/Controllers/Admin/ProductController';
import {
    index as guidesIndex,
    update,
} from '@/actions/App/Http/Controllers/Admin/ProductGuideController';
import { PagePanel } from '@/components/page-panel';
import { ProductGuideForm } from '@/components/product-guide-form';
import type { GuideRecord } from '@/components/product-guide-form';
import { SeoHead } from '@/components/seo-head';

type Product = {
    id: number;
    title: string;
    slug: string | null;
};

export default function EditProductGuide({
    product,
    guide,
}: {
    product: Product;
    guide: GuideRecord;
}) {
    const productKey = product.slug ?? String(product.id);

    return (
        <>
            <SeoHead title={`Edit ${guide.title}`} />

            <PagePanel variant="transparent">
                <ProductGuideForm
                    submitUrl={update.url({ product: productKey, guide })}
                    cancelUrl={guidesIndex.url(productKey)}
                    productTitle={product.title}
                    guide={guide}
                />
            </PagePanel>
        </>
    );
}

EditProductGuide.layout = {
    breadcrumbs: [
        { title: 'Products', href: productsIndex().url },
        { title: 'Guides', href: '#' },
        { title: 'Edit', href: '#' },
    ],
};
