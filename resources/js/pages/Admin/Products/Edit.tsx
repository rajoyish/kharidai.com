import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ProductForm, type Product } from '@/components/ProductForm';

export default function EditProduct({ product }: { product: Product }) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Products', href: '/admin/products' },
                { title: 'Edit', href: `/admin/products/${product.id}/edit` },
            ]}
        >
            <Head title="Edit Product" />

            <div className="flex h-full flex-1 flex-col p-4 md:p-8">
                <ProductForm
                    product={product}
                    submitUrl={`/admin/products/${product.id}`}
                    isEditing={true}
                />
            </div>
        </AppLayout>
    );
}
