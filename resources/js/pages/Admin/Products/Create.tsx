import {
    create as createProduct,
    index as productsIndex,
    store,
} from '@/actions/App/Http/Controllers/Admin/ProductController';
import { PagePanel } from '@/components/page-panel';
import { ProductForm } from '@/components/ProductForm';
import { SeoHead } from '@/components/seo-head';

type ProductTypeOption = { value: string; label: string };

export default function CreateProduct({
    categories,
    productTypes,
}: {
    categories: any[];
    productTypes: ProductTypeOption[];
}) {
    return (
        <>
            <SeoHead title="Create Product" />

            <PagePanel variant="transparent">
                <ProductForm
                    submitUrl={store.url()}
                    categories={categories}
                    productTypes={productTypes}
                />
            </PagePanel>
        </>
    );
}

CreateProduct.layout = {
    breadcrumbs: [
        { title: 'Products', href: productsIndex().url },
        { title: 'Create', href: createProduct().url },
    ],
};
