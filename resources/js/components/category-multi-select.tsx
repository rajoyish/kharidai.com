import { useEffect, useMemo } from 'react';

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

export type CategoryOption = {
    id: number;
    name: string;
    type: string | null;
    parent_id: number | null;
};

type CategoryItem = {
    value: number;
    label: string;
};

type CategoryMultiSelectProps = {
    categories: CategoryOption[];
    /** The currently selected product type; scopes the available categories. */
    productType: string;
    value: number[];
    onChange: (ids: number[]) => void;
    inputId?: string;
    invalid?: boolean;
};

/**
 * A multi-select category picker rendered as removable chips. The options react
 * instantly to the chosen product type: only categories that match that type
 * (or are untyped, i.e. applicable to any type) are offered.
 */
export function CategoryMultiSelect({
    categories,
    productType,
    value,
    onChange,
    inputId,
    invalid,
}: CategoryMultiSelectProps) {
    const anchor = useComboboxAnchor();

    const parentNames = useMemo(() => {
        const map = new Map<number, string>();
        categories.forEach((category) => map.set(category.id, category.name));

        return map;
    }, [categories]);

    const items = useMemo<CategoryItem[]>(() => {
        return categories
            .filter(
                (category) =>
                    category.type === null || category.type === productType,
            )
            .map((category) => ({
                value: category.id,
                label:
                    category.parent_id && parentNames.has(category.parent_id)
                        ? `${parentNames.get(category.parent_id)} › ${category.name}`
                        : category.name,
            }));
    }, [categories, productType, parentNames]);

    const itemById = useMemo(
        () => new Map(items.map((item) => [item.value, item])),
        [items],
    );

    // Prune any selected categories that no longer belong to the chosen type so
    // the form never submits categories that are hidden from the picker.
    useEffect(() => {
        const pruned = value.filter((id) => itemById.has(id));

        if (pruned.length !== value.length) {
            onChange(pruned);
        }
    }, [itemById, value, onChange]);

    const selectedItems = useMemo(
        () =>
            value
                .map((id) => itemById.get(id))
                .filter((item): item is CategoryItem => item !== undefined),
        [value, itemById],
    );

    return (
        <Combobox
            items={items}
            multiple
            value={selectedItems}
            onValueChange={(selected: CategoryItem[]) =>
                onChange(selected.map((item) => item.value))
            }
            isItemEqualToValue={(a: CategoryItem, b: CategoryItem) =>
                a.value === b.value
            }
        >
            <ComboboxChips ref={anchor} aria-invalid={invalid}>
                <ComboboxValue>
                    {(selected: CategoryItem[]) =>
                        selected.map((item) => (
                            <ComboboxChip
                                key={item.value}
                                aria-label={item.label}
                            >
                                {item.label}
                            </ComboboxChip>
                        ))
                    }
                </ComboboxValue>
                <ComboboxChipsInput
                    id={inputId}
                    placeholder={
                        selectedItems.length > 0 ? '' : 'Select categories…'
                    }
                />
            </ComboboxChips>
            <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>No categories found.</ComboboxEmpty>
                <ComboboxList>
                    {(item: CategoryItem) => (
                        <ComboboxItem key={item.value} value={item}>
                            {item.label}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
