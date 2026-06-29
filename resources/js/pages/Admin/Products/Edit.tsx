import { Head } from '@inertiajs/react';
import { ProductForm, type Product } from '@/components/ProductForm';

import { PagePanel } from '@/components/page-panel';

export default function EditProduct({ product, categories }: { product: Product, categories: any[] }) {
    return (
        <>
            <Head title="Edit Product" />

            <PagePanel variant="transparent">
                <ProductForm
                    product={product}
                    submitUrl={`/admin/products/${product.slug}`}
                    isEditing={true}
                    categories={categories}
                />
            </PagePanel>
        </>
    );
}

EditProduct.layout = {
    breadcrumbs: [
        { title: 'Products', href: '/admin/products' },
        { title: 'Edit', href: '#' },
    ],
};
