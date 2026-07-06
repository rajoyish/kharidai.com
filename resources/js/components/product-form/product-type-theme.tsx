import { CloudDownload, Package, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The product types that drive the dynamic form. Mirrors the `ProductType`
 * PHP enum (`digital`, `physical`, `service`) so the frontend and backend
 * stay in lockstep without duplicating labels.
 */
export type ProductTypeValue = 'digital' | 'physical' | 'service';

/**
 * A self-contained visual identity for a single product type. Every class is a
 * complete literal string so Tailwind's JIT compiler can see it — never build
 * these by interpolation.
 *
 * @property card       Accent border for the outer form card.
 * @property badge      Pill shown next to the form title indicating active type.
 * @property iconWrap   Rounded icon chip background + foreground.
 * @property fieldset   Themed container for the type-specific fieldset.
 * @property accentText Heading colour used inside the themed fieldset.
 */
export type ProductTypeTheme = {
    label: string;
    tagline: string;
    Icon: LucideIcon;
    card: string;
    badge: string;
    iconWrap: string;
    fieldset: string;
    accentText: string;
    /** Example placeholder for a variant's name field, tuned per type. */
    variantNamePlaceholder: string;
};

export const PRODUCT_TYPE_THEMES: Record<ProductTypeValue, ProductTypeTheme> = {
    digital: {
        label: 'Digital',
        tagline: 'Downloads, licenses, and subscriptions delivered instantly.',
        Icon: CloudDownload,
        card: 'border-sky-200 dark:border-sky-900/60',
        badge: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
        iconWrap: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
        fieldset:
            'border-sky-200 bg-sky-50/50 dark:border-sky-900/60 dark:bg-sky-950/20',
        accentText: 'text-sky-800 dark:text-sky-200',
        variantNamePlaceholder: 'e.g. 18 Months | Activation Link',
    },
    physical: {
        label: 'Physical',
        tagline: 'Tangible goods that are packed, shipped, and delivered.',
        Icon: Package,
        card: 'border-amber-200 dark:border-amber-900/60',
        badge: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
        iconWrap:
            'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
        fieldset:
            'border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20',
        accentText: 'text-amber-800 dark:text-amber-200',
        variantNamePlaceholder: 'e.g. Regular, Deluxe',
    },
    service: {
        label: 'Service',
        tagline: 'Bespoke, hands-on work scoped and priced per engagement.',
        Icon: Wrench,
        card: 'border-violet-200 dark:border-violet-900/60',
        badge: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
        iconWrap:
            'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
        fieldset:
            'border-violet-200 bg-violet-50/50 dark:border-violet-900/60 dark:bg-violet-950/20',
        accentText: 'text-violet-800 dark:text-violet-200',
        variantNamePlaceholder: 'e.g. Standard Package',
    },
};

/**
 * Resolve the theme for a product type, defaulting to the digital theme for any
 * unknown or missing value so the form always has a coherent look.
 */
export function getProductTypeTheme(type?: string): ProductTypeTheme {
    return (
        PRODUCT_TYPE_THEMES[type as ProductTypeValue] ??
        PRODUCT_TYPE_THEMES.digital
    );
}

type ProductTypeSectionProps = {
    theme: ProductTypeTheme;
    title: string;
    description: string;
    children: ReactNode;
};

/**
 * Themed shell shared by every type-specific fieldset. It renders the accent
 * icon, heading, and container chrome so the individual field components only
 * have to describe their own inputs.
 */
export function ProductTypeSection({
    theme,
    title,
    description,
    children,
}: ProductTypeSectionProps) {
    const { Icon } = theme;

    return (
        <section
            className={cn('grid gap-6 rounded-xl border p-5', theme.fieldset)}
        >
            <div className="flex items-start gap-3">
                <div
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-lg',
                        theme.iconWrap,
                    )}
                >
                    <Icon className="size-5" aria-hidden="true" />
                </div>
                <div className="grid gap-0.5">
                    <h3 className={cn('font-semibold', theme.accentText)}>
                        {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            {children}
        </section>
    );
}
