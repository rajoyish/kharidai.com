import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

/**
 * Validates a Nepalese mobile number and identifies the carrier.
 * Supports optional '+977' country code or '977' prefix.
 *
 * @param {string} number - The input mobile number.
 * @returns {object} Validation result containing status and carrier.
 */
export function validateNepaleseNumber(number: string) {
    if (!number) {
        return { isValid: false, carrier: null };
    }

    // Remove all whitespace, dashes, and parenthetical elements
    const cleanNumber = number.replace(/[\s\-()]/g, '');

    // Normalize country code (+977 or 977) to a clean 10-digit format
    const standardNumber = cleanNumber.replace(/^(\+?977)?/, '');

    // Define Regular Expressions for specific carriers
    const ntcRegex = /^(984|985|986|974|975|976)\d{7}$/;
    const ncellRegex = /^(980|981|982|970|971)\d{7}$/;

    if (ntcRegex.test(standardNumber)) {
        return { isValid: true, carrier: 'NTC' };
    }

    if (ncellRegex.test(standardNumber)) {
        return { isValid: true, carrier: 'Ncell' };
    }

    return { isValid: false, carrier: 'Unknown' };
}

interface MobileNumberInputProps extends React.ComponentProps<'input'> {
    onValueChange?: (value: string) => void;
}

export function MobileNumberInput({
    className,
    value,
    defaultValue,
    onChange,
    onValueChange,
    ...props
}: MobileNumberInputProps) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue || '');

    const displayValue = isControlled ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;

        if (!isControlled) {
            setInternalValue(val);
        }

        if (onChange) {
            onChange(e);
        }

        if (onValueChange) {
            onValueChange(val);
        }
    };

    const validation = validateNepaleseNumber(displayValue as string);

    return (
        <div className="relative">
            <Input
                type="tel"
                value={displayValue}
                onChange={handleChange}
                className={className}
                {...props}
            />
            {displayValue &&
                validation.carrier &&
                validation.carrier !== 'Unknown' && (
                    <div className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 items-center">
                        <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                validation.carrier === 'NTC'
                                    ? 'bg-info-surface text-info dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            }`}
                        >
                            {validation.carrier}
                        </span>
                    </div>
                )}
        </div>
    );
}
