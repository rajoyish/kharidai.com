import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ProductForm } from '@/components/ProductForm';

export default function CreateProduct() {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Products', href: '/admin/products' },
                { title: 'Create', href: '/admin/products/create' },
            ]}
        >
            <Head title="Create Product" />

            <div className="flex h-full flex-1 flex-col p-4 md:p-8">
                <ProductForm submitUrl="/admin/products" />
            </div>
        </AppLayout>
    );
}
