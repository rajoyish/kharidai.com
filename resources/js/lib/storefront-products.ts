import type { StorefrontCategory, StorefrontProduct } from '@/types';

/**
 * Remove products that share an id, keeping the first occurrence and order. A
 * product attached to several categories (e.g. a parent and one of its
 * subcategories) is a single item and must only be listed and counted once.
 */
export function dedupeProducts(
    products: StorefrontProduct[],
): StorefrontProduct[] {
    const seen = new Set<number>();

    return products.filter((product) => {
        if (seen.has(product.id)) {
            return false;
        }

        seen.add(product.id);

        return true;
    });
}

/**
 * All in-stock products for a category — its own plus every subcategory's —
 * flattened into one list with duplicates removed.
 */
export function collectCategoryProducts(
    category: StorefrontCategory,
): StorefrontProduct[] {
    const childProducts = (category.children ?? []).flatMap(
        (child) => child.products ?? [],
    );

    return dedupeProducts([...category.products, ...childProducts]);
}

/**
 * Every unique product across a set of categories (subcategories folded in) plus
 * any uncategorized products, so a product listed in more than one place counts
 * a single time toward totals such as the "Available now" stat.
 */
export function collectAllProducts(
    categories: StorefrontCategory[],
    uncategorizedProducts: StorefrontProduct[] = [],
): StorefrontProduct[] {
    return dedupeProducts([
        ...categories.flatMap(collectCategoryProducts),
        ...uncategorizedProducts,
    ]);
}
