import { Download, Infinity as InfinityIcon, ShieldCheck } from 'lucide-react';

import { ProductTypeSection } from './product-type-theme';
import type { ProductTypeTheme } from './product-type-theme';

type DigitalProductFieldsProps = {
    theme: ProductTypeTheme;
};

/**
 * Type-specific fieldset for digital products. Digital products carry no
 * dedicated payload fields today, so this component surfaces the delivery
 * context and reserves an isolated home for any future digital-only inputs —
 * keeping them out of the physical and service components.
 */
export function DigitalProductFields({ theme }: DigitalProductFieldsProps) {
    return (
        <ProductTypeSection
            theme={theme}
            title="Digital delivery"
            description="Instantly delivered items with no shipping or scheduling."
        >
            <ul className="grid gap-3 sm:grid-cols-3">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Download className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    Buyers receive access immediately after checkout.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <InfinityIcon className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    No stock limits — sell the same file any number of times.
                </li>
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    No shipping, weight, or fulfilment details required.
                </li>
            </ul>
        </ProductTypeSection>
    );
}
