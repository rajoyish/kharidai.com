import { Head } from '@inertiajs/react';
import { ProductForm } from '@/components/ProductForm';

import { PagePanel } from '@/components/page-panel';

export default function CreateProduct({ categories }: { categories: any[] }) {
    return (
        <>
            <Head title="Create Product" />

            <PagePanel variant="transparent">
                <ProductForm submitUrl="/admin/products" categories={categories} />
            </PagePanel>
        </>
    );
}

CreateProduct.layout = {
    breadcrumbs: [
                { title: 'Products', href: '/admin/products' },
                { title: 'Create', href: '/admin/products/create' },
            ],
};
