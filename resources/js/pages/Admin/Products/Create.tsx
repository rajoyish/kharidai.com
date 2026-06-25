import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ProductForm } from '@/components/ProductForm';

import { PagePanel } from '@/components/page-panel';

export default function CreateProduct() {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Products', href: '/admin/products' },
                { title: 'Create', href: '/admin/products/create' },
            ]}
        >
            <Head title="Create Product" />

            <PagePanel variant="transparent">
                <ProductForm submitUrl="/admin/products" />
            </PagePanel>
        </AppLayout>
    );
}
