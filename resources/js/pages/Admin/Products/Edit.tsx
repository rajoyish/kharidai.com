import {
    index as productsIndex,
    update,
} from '@/actions/App/Http/Controllers/Admin/ProductController';
import { PagePanel } from '@/components/page-panel';
import { ProductForm } from '@/components/ProductForm';
import type { Product } from '@/components/ProductForm';
import { SeoHead } from '@/components/seo-head';

type ProductTypeOption = { value: string; label: string };

export default function EditProduct({
    product,
    categories,
    productTypes,
}: {
    product: Product;
    categories: any[];
    productTypes: ProductTypeOption[];
}) {
    return (
        <>
            <SeoHead title="Edit Product" />

            <PagePanel variant="transparent">
                <ProductForm
                    product={product}
                    submitUrl={update.url({ product: product.slug! })}
                    isEditing={true}
                    categories={categories}
                    productTypes={productTypes}
                />
            </PagePanel>
        </>
    );
}

EditProduct.layout = {
    breadcrumbs: [
        { title: 'Products', href: productsIndex().url },
        { title: 'Edit', href: '#' },
    ],
};
