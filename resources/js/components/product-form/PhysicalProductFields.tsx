import { Boxes, Ruler, Truck } from 'lucide-react';

import { ProductTypeSection } from './product-type-theme';
import type { ProductTypeTheme } from './product-type-theme';

type PhysicalProductFieldsProps = {
    theme: ProductTypeTheme;
};

/**
 * Type-specific fieldset for physical products. Shipping and inventory inputs
 * are managed through the product's variants rather than the base payload, so
 * this component frames that fulfilment context and gives future physical-only
 * inputs an isolated home away from the digital and service components.
 */
export function PhysicalProductFields({ theme }: PhysicalProductFieldsProps) {
    return (
        <ProductTypeSection
            theme={theme}
            title="Shipping & fulfilment"
            description="Tangible goods that are packed and shipped to the buyer."
        >
            <ul className="grid gap-3 sm:grid-cols-3">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Boxes className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    Track stock per variant to prevent overselling.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Ruler className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    Capture size and weight on each variant for accurate rates.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Truck className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    Shipping is calculated at checkout from the delivery
                    address.
                </li>
            </ul>
        </ProductTypeSection>
    );
}
