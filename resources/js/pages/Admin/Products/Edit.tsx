import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ProductForm, type Product } from '@/components/ProductForm';

import { PagePanel } from '@/components/page-panel';

export default function EditProduct({ product }: { product: Product }) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Products', href: '/admin/products' },
                { title: 'Edit', href: `/admin/products/${product.id}/edit` },
            ]}
        >
            <Head title="Edit Product" />

            <PagePanel variant="transparent">
                <ProductForm
                    product={product}
                    submitUrl={`/admin/products/${product.id}`}
                    isEditing={true}
                />
            </PagePanel>
        </AppLayout>
    );
}
