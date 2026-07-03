import { update } from '@/actions/App/Http/Controllers/Admin/ProductController';
import { PagePanel } from '@/components/page-panel';
import { ProductForm  } from '@/components/ProductForm';
import type {Product} from '@/components/ProductForm';
import { SeoHead } from '@/components/seo-head';

export default function EditProduct({ product, categories }: { product: Product, categories: any[] }) {
    return (
        <>
            <SeoHead title="Edit Product" />

            <PagePanel variant="transparent">
                <ProductForm
                    product={product}
                    submitUrl={update.url({ product: product.slug! })}
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
