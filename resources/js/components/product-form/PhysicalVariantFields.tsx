import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { ChipListInput } from './ChipListInput';
import { ProductTypeSection } from './product-type-theme';
import type { ProductTypeTheme } from './product-type-theme';

type PhysicalVariantData = {
    colors: string[];
    sizes: string[];
    weight_kg: string;
    ships_individually: boolean;
};

type PhysicalVariantFieldsProps = {
    theme: ProductTypeTheme;
    data: PhysicalVariantData;
    setData: {
        (key: 'colors' | 'sizes', value: string[]): void;
        (key: 'weight_kg', value: string): void;
        (key: 'ships_individually', value: boolean): void;
    };
    errors: Record<string, string>;
};

/**
 * Physical-only inputs for a product variant. Color and size are option lists
 * the shopper picks from on the product page (captured per line item). Weight
 * is a single value for the variant — the shipping calculator bills it exactly.
 * Kept in its own module so physical concerns never leak into other types.
 */
export function PhysicalVariantFields({
    theme,
    data,
    setData,
    errors,
}: PhysicalVariantFieldsProps) {
    // Surface the array-level error or the first per-item error for a field.
    const errorFor = (field: 'colors' | 'sizes'): string | undefined => {
        if (errors[field]) {
            return errors[field];
        }

        const nested = Object.keys(errors).find((key) =>
            key.startsWith(`${field}.`),
        );

        return nested ? errors[nested] : undefined;
    };

    return (
        <ProductTypeSection
            theme={theme}
            title="Physical attributes"
            description="Add each color and size the shopper can choose. Weight is billed exactly for shipping."
        >
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
                <ChipListInput
                    id="colors"
                    label="Colors"
                    value={data.colors}
                    onChange={(next) => setData('colors', next)}
                    placeholder="e.g. Red or #50C878"
                    withSwatch
                    hint="Use a CSS color name (e.g. teal) or a hex code (e.g. #50C878). No swatch means the name isn't a CSS color — enter its hex instead."
                    error={errorFor('colors')}
                />
                <ChipListInput
                    id="sizes"
                    label="Sizes"
                    value={data.sizes}
                    onChange={(next) => setData('sizes', next)}
                    placeholder="e.g. XL"
                    error={errorFor('sizes')}
                />
                <div className="grid gap-2">
                    <Label htmlFor="weight_kg">Weight (kg)</Label>
                    <Input
                        id="weight_kg"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.weight_kg}
                        onChange={(e) => setData('weight_kg', e.target.value)}
                        placeholder="e.g. 0.5"
                    />
                    <p className="text-xs text-muted-foreground">
                        In kilograms. Used directly for shipping.
                    </p>
                    {errors.weight_kg && (
                        <div className="text-sm text-destructive">
                            {errors.weight_kg}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-md border p-4">
                <Switch
                    id="ships_individually"
                    checked={data.ships_individually}
                    onCheckedChange={(checked) =>
                        setData('ships_individually', checked)
                    }
                />
                <div className="grid gap-1">
                    <Label htmlFor="ships_individually">
                        Ships in its own parcel
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        Turn on for bulky items (e.g. a laptop). Each unit is
                        charged its own parcel and never combined with others,
                        even under a zone's parcel weight limit.
                    </p>
                    {errors.ships_individually && (
                        <div className="text-sm text-destructive">
                            {errors.ships_individually}
                        </div>
                    )}
                </div>
            </div>
        </ProductTypeSection>
    );
}
