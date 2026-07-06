import { isCssColor } from '@/lib/css-colors';
import { cn } from '@/lib/utils';

export type SelectedOptions = {
    color?: string;
    size?: string;
} | null;

type VariantOptionBadgesProps = {
    /** The color/size the shopper chose for this line item, captured at checkout. */
    selectedOptions?: SelectedOptions;
    /** The variant's shipping weight in grams; only physical variants carry one. */
    weightGrams?: number | null;
    className?: string;
};

const badgeClassName =
    'inline-flex items-center gap-1.5 rounded-md border bg-muted px-2 py-0.5 text-xs text-muted-foreground';

/**
 * Renders the shopper-chosen color and size plus the variant's shipping weight
 * as compact badges. The color previews as a swatch when the browser recognizes
 * it as a CSS color (name or hex). Returns nothing when none of the three are
 * present, so it is safe to drop next to any line item regardless of type.
 */
export function VariantOptionBadges({
    selectedOptions,
    weightGrams,
    className,
}: VariantOptionBadgesProps) {
    const color = selectedOptions?.color;
    const size = selectedOptions?.size;
    const hasWeight = typeof weightGrams === 'number' && weightGrams > 0;

    if (!color && !size && !hasWeight) {
        return null;
    }

    return (
        <div className={cn('flex flex-wrap gap-1.5', className)}>
            {color && (
                <span className={badgeClassName}>
                    {isCssColor(color) && (
                        <span
                            className="size-3 rounded-full border"
                            style={{ backgroundColor: color }}
                            aria-hidden="true"
                        />
                    )}
                    Color: {color}
                </span>
            )}
            {size && <span className={badgeClassName}>Size: {size}</span>}
            {hasWeight && (
                <span className={badgeClassName}>Weight: {weightGrams}g</span>
            )}
        </div>
    );
}
