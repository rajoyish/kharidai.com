import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { isCssColor } from '@/lib/css-colors';
import { cn } from '@/lib/utils';

type VariantOptionSelectorProps = {
    id: string;
    label: string;
    options: string[];
    value: string | null;
    onChange: (value: string) => void;
    /** Render a color dot before each label when the name is a valid CSS color. */
    withSwatch?: boolean;
};

/**
 * Single-select option picker rendered as a row of bordered buttons (the
 * selected one gets the primary accent), mirroring the color/size selectors
 * seen on product detail pages. Built on RadioGroup for keyboard accessibility.
 */
export function VariantOptionSelector({
    id,
    label,
    options,
    value,
    onChange,
    withSwatch = false,
}: VariantOptionSelectorProps) {
    return (
        <div>
            <div className="mb-3 flex items-baseline gap-3">
                <h3 className="text-sm font-medium tracking-wider text-muted-foreground uppercase">
                    {label}
                </h3>
                {value && (
                    <span className="text-sm font-semibold text-foreground">
                        {value}
                    </span>
                )}
            </div>
            <RadioGroup
                value={value ?? ''}
                onValueChange={onChange}
                className="flex flex-wrap gap-2"
            >
                {options.map((option) => (
                    <Label
                        key={option}
                        htmlFor={`${id}-${option}`}
                        className={cn(
                            'flex min-w-12 cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                            '[&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:text-primary',
                        )}
                    >
                        {withSwatch && isCssColor(option) && (
                            <span
                                className="size-4 rounded-full border"
                                style={{ backgroundColor: option }}
                                aria-hidden="true"
                            />
                        )}
                        {option}
                        <RadioGroupItem
                            id={`${id}-${option}`}
                            value={option}
                            className="sr-only"
                        />
                    </Label>
                ))}
            </RadioGroup>
        </div>
    );
}
