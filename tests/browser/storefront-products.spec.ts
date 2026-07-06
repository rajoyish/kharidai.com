import { expect, test } from '@playwright/test';

import {
    collectAllProducts,
    collectCategoryProducts,
    dedupeProducts,
} from '../../resources/js/lib/storefront-products';
import type { StorefrontCategory, StorefrontProduct } from '../../resources/js/types';

function makeProduct(id: number, title: string): StorefrontProduct {
    return {
        id,
        title,
        slug: `product-${id}`,
        description: null,
        image: null,
        variants: [],
    };
}

test.describe('storefront product collection', () => {
    test('dedupeProducts drops repeated ids and keeps first order', () => {
        const a = makeProduct(1, 'Panties');
        const b = makeProduct(2, 'Shorts');

        const result = dedupeProducts([a, b, a]);

        expect(result.map((product) => product.id)).toEqual([1, 2]);
    });

    test('collectCategoryProducts lists a product once when it is in both a parent and its subcategory', () => {
        const shared = makeProduct(1, 'Women Menstrual Panties');
        const women: StorefrontCategory = {
            id: 10,
            name: 'Women',
            slug: 'women',
            products: [shared],
            children: [
                {
                    id: 11,
                    name: 'Panties',
                    slug: 'panties',
                    products: [shared],
                },
            ],
        };

        const products = collectCategoryProducts(women);

        expect(products).toHaveLength(1);
        expect(products[0].id).toBe(1);
    });

    test('collectAllProducts counts each product once for the "Available now" stat', () => {
        const panties = makeProduct(1, 'Women Menstrual Panties');
        const shorts = makeProduct(3, 'High Waist Denim Half Pants Shorts');
        const uncategorized = makeProduct(5, 'Standalone Product');

        const women: StorefrontCategory = {
            id: 10,
            name: 'Women',
            slug: 'women',
            products: [panties, shorts],
            children: [
                { id: 11, name: 'Panties', slug: 'panties', products: [panties] },
                { id: 12, name: 'Shorts', slug: 'shorts', products: [shorts] },
            ],
        };

        const products = collectAllProducts([women], [uncategorized]);

        expect(products).toHaveLength(3);
        expect(products.map((product) => product.id).sort()).toEqual([1, 3, 5]);
    });
});
