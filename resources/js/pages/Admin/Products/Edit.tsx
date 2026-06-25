import { Head } from '@inertiajs/react';
import { ProductForm, type Product } from '@/components/ProductForm';

import { PagePanel } from '@/components/page-panel';

export default function EditProduct({ product }: { product: Product }) {
    return (
        <>
            <Head title="Edit Product" />

            <PagePanel variant="transparent">
                <ProductForm
                    product={product}
                    submitUrl={`/admin/products/${product.id}`}
                    isEditing={true}
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
