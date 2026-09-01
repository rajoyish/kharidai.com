import { useMemo } from 'react';

import type { NewsletterRecipientOption } from '@/components/newsletter-composer';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
    ComboboxValue,
    useComboboxAnchor,
} from '@/components/ui/combobox';
import { Skeleton } from '@/components/ui/skeleton';

type RecipientItem = {
    value: number;
    label: string;
    email: string;
};

type NewsletterRecipientPickerProps = {
    /** Everyone eligible. Undefined while the audience prop is still loading. */
    audienceUsers?: NewsletterRecipientOption[];
    value: NewsletterRecipientOption[];
    onChange: (users: NewsletterRecipientOption[]) => void;
    inputId?: string;
    invalid?: boolean;
};

/**
 * Search-and-pick for addressing a newsletter to named people.
 *
 * Selections show as removable chips and the query matches name or email, since
 * an admin chasing one customer usually has the address rather than the spelling
 * of their name.
 */
export function NewsletterRecipientPicker({
    audienceUsers,
    value,
    onChange,
    inputId,
    invalid,
}: NewsletterRecipientPickerProps) {
    const anchor = useComboboxAnchor();

    const items = useMemo<RecipientItem[]>(
        () =>
            (audienceUsers ?? []).map((user) => ({
                value: user.id,
                label: user.name,
                email: user.email,
            })),
        [audienceUsers],
    );

    /**
     * The picked people are kept as full options rather than ids so a chip can
     * still name someone the audience list has not arrived for yet, which is the
     * state the page is in when it opens with ?users= in the URL.
     */
    const selectedItems = useMemo<RecipientItem[]>(
        () =>
            value.map((user) => ({
                value: user.id,
                label: user.name,
                email: user.email,
            })),
        [value],
    );

    if (audienceUsers === undefined) {
        return (
            <div
                className="grid gap-2"
                role="status"
                aria-label="Loading the list of people you can pick"
            >
                <Skeleton className="h-9 w-full rounded-md" />
                <p className="text-xs text-muted-foreground">
                    Loading everyone you can pick from…
                </p>
            </div>
        );
    }

    return (
        <Combobox
            items={items}
            multiple
            value={selectedItems}
            onValueChange={(selected: RecipientItem[]) =>
                onChange(
                    selected.map((item) => ({
                        id: item.value,
                        name: item.label,
                        email: item.email,
                    })),
                )
            }
            isItemEqualToValue={(a: RecipientItem, b: RecipientItem) =>
                a.value === b.value
            }
            // Both fields feed the filter, so typing part of an address finds the
            // person even when their name is spelled differently than expected.
            itemToStringLabel={(item: RecipientItem) =>
                `${item.label} ${item.email}`
            }
        >
            <ComboboxChips ref={anchor} aria-invalid={invalid}>
                <ComboboxValue>
                    {(selected: RecipientItem[]) =>
                        selected.map((item) => (
                            <ComboboxChip
                                key={item.value}
                                aria-label={`${item.label}, ${item.email}`}
                            >
                                {item.label}
                            </ComboboxChip>
                        ))
                    }
                </ComboboxValue>
                <ComboboxChipsInput
                    id={inputId}
                    placeholder={
                        selectedItems.length > 0
                            ? ''
                            : 'Search by name or email…'
                    }
                />
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>No one matches that.</ComboboxEmpty>
                <ComboboxList>
                    {(item: RecipientItem) => (
                        <ComboboxItem key={item.value} value={item}>
                            <span className="grid min-w-0 gap-0.5">
                                <span className="truncate font-medium">
                                    {item.label}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {item.email}
                                </span>
                            </span>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
