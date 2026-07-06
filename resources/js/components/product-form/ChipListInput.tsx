import { X } from 'lucide-react';
import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isCssColor } from '@/lib/css-colors';

type ChipListInputProps = {
    id: string;
    label: string;
    value: string[];
    onChange: (next: string[]) => void;
    placeholder?: string;
    /** Numeric mode restricts input to whole numbers and appends `suffix`. */
    numeric?: boolean;
    /** Unit appended to each chip label in numeric mode, e.g. "g". */
    suffix?: string;
    /**
     * Preview each value as a color swatch when the browser recognizes it as a
     * CSS color (a named color or a hex/rgb value). Values it doesn't recognize
     * show no swatch — a cue to enter an equivalent hex code instead.
     */
    withSwatch?: boolean;
    error?: string;
    hint?: string;
};

/**
 * A tag-style input for collecting a list of short values (colors, sizes,
 * weights). Users type a value and press Enter or comma to add it as a chip;
 * chips can be removed individually. Values are de-duplicated and never blank.
 */
export function ChipListInput({
    id,
    label,
    value,
    onChange,
    placeholder,
    numeric = false,
    suffix,
    withSwatch = false,
    error,
    hint,
}: ChipListInputProps) {
    const [draft, setDraft] = useState('');

    const draftPreviewsAsColor =
        withSwatch && draft.trim() !== '' && isCssColor(draft);

    const addChip = () => {
        const token = draft.trim();

        if (token === '') {
            return;
        }

        if (numeric && !/^\d+$/.test(token)) {
            return;
        }

        if (!value.includes(token)) {
            onChange([...value, token]);
        }

        setDraft('');
    };

    const removeChip = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addChip();

            return;
        }

        // Backspace on an empty draft removes the last chip.
        if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            removeChip(value.length - 1);
        }
    };

    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {value.map((chip, index) => (
                        <Badge
                            key={`${chip}-${index}`}
                            variant="secondary"
                            className="gap-1 pr-1"
                        >
                            {withSwatch && isCssColor(chip) && (
                                <span
                                    className="size-3 rounded-full border"
                                    style={{ backgroundColor: chip }}
                                    aria-hidden="true"
                                />
                            )}
                            {numeric && suffix ? `${chip}${suffix}` : chip}
                            <button
                                type="button"
                                onClick={() => removeChip(index)}
                                className="rounded-sm opacity-60 hover:opacity-100"
                                aria-label={`Remove ${chip}`}
                            >
                                <X className="size-3" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}

            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Input
                        id={id}
                        inputMode={numeric ? 'numeric' : 'text'}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={addChip}
                        placeholder={placeholder}
                        className={withSwatch ? 'pl-9' : undefined}
                    />
                    {withSwatch && draftPreviewsAsColor && (
                        <span
                            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 rounded-full border"
                            style={{ backgroundColor: draft.trim() }}
                            aria-hidden="true"
                        />
                    )}
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={addChip}
                    disabled={draft.trim() === ''}
                >
                    Add
                </Button>
            </div>

            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <div className="text-sm text-destructive">{error}</div>}
        </div>
    );
}
