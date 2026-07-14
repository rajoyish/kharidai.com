import { Link, router, useForm } from '@inertiajs/react';
import { CornerDownRight, ExternalLink, GripVertical } from 'lucide-react';
import { useState } from 'react';
import type { DragEvent } from 'react';

import {
    destroy as destroyItem,
    index as menusIndex,
    reorder,
    store as storeItem,
    update as updateItem,
} from '@/actions/App/Http/Controllers/Admin/MenuController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

type LinkType = 'custom' | 'page';

type MenuItemRow = {
    id: number;
    label: string;
    link_type: LinkType;
    url: string | null;
    page_id: number | null;
    page_title: string | null;
    opens_in_new_tab: boolean;
    is_active: boolean;
    /** Resolved destination, or null when the item points at nothing renderable. */
    href: string | null;
};

type MenuNodeRow = MenuItemRow & { children: MenuItemRow[] };

type PageOption = { id: number; title: string; slug: string };

type MenuLocation = { value: string; label: string };

type MenuForm = {
    location: string;
    label: string;
    link_type: LinkType;
    url: string;
    page_id: string;
    parent_id: string;
    opens_in_new_tab: boolean;
    is_active: boolean;
};

/** The "no parent" sentinel — Radix Select cannot hold an empty-string value. */
const TOP_LEVEL = 'top';

function blankForm(location: string): MenuForm {
    return {
        location,
        label: '',
        link_type: 'custom',
        url: '',
        page_id: '',
        parent_id: TOP_LEVEL,
        opens_in_new_tab: false,
        is_active: true,
    };
}

export default function MenusIndex({
    location,
    locations,
    items,
    pages,
}: {
    location: string;
    locations: MenuLocation[];
    items: MenuNodeRow[];
    pages: PageOption[];
}) {
    const [rows, setRows] = useState<MenuNodeRow[]>(items);
    const [syncedItems, setSyncedItems] = useState<MenuNodeRow[]>(items);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [itemToDelete, setItemToDelete] = useState<MenuItemRow | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const form = useForm<MenuForm>(blankForm(location));

    // `rows` is optimistic during a drag; re-sync whenever the server sends
    // fresh props (reorder, save, delete, or a switch of location).
    if (items !== syncedItems) {
        setSyncedItems(items);
        setRows(items);
    }

    // `setDefaults()` is a state update, so a `reset()` in the same tick still
    // reads the *previous* defaults out of its closure and leaves the form one
    // action behind. Writing the data straight across avoids that entirely.
    const startEditing = (item: MenuItemRow, parentId: number | null) => {
        setEditingId(item.id);
        form.clearErrors();
        form.setData({
            location,
            label: item.label,
            link_type: item.link_type,
            url: item.url ?? '',
            page_id: item.page_id ? String(item.page_id) : '',
            parent_id: parentId ? String(parentId) : TOP_LEVEL,
            opens_in_new_tab: item.opens_in_new_tab,
            is_active: item.is_active,
        });
    };

    const stopEditing = () => {
        setEditingId(null);
        form.clearErrors();
        form.setData(blankForm(location));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        // The select needs a non-empty value to represent "no parent", but the
        // server wants a real null.
        form.transform((data) => ({
            ...data,
            parent_id: data.parent_id === TOP_LEVEL ? null : data.parent_id,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => stopEditing(),
        };

        if (editingId) {
            form.submit(updateItem({ menu: editingId }), options);

            return;
        }

        form.submit(storeItem(), options);
    };

    /**
     * Top-level rows reorder by drag. Which parent an item hangs off is set in
     * the form instead — a two-axis drag (reorder *and* nest) is fiddly to hit
     * accurately, and the menu is short enough that a select is faster.
     */
    const handleDrop = (event: DragEvent, targetIndex: number) => {
        event.preventDefault();

        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);

            return;
        }

        const next = [...rows];
        const [moved] = next.splice(draggedIndex, 1);
        next.splice(targetIndex, 0, moved);

        setRows(next);
        setDraggedIndex(null);

        router.patch(
            reorder.url(),
            {
                location,
                tree: next.map((node) => ({
                    id: node.id,
                    children: node.children.map((child) => ({ id: child.id })),
                })),
            },
            { preserveScroll: true },
        );
    };

    const parentOptions = rows.filter((row) => row.id !== editingId);
    const isCustom = form.data.link_type === 'custom';

    return (
        <>
            <SeoHead title="Menu Builder" />

            <PagePanel
                title="Menus"
                variant="transparent"
                description="Build the storefront menus. Drag rows to reorder; nest an item to turn its parent into a dropdown."
                actions={
                    <div className="flex gap-2">
                        {locations.map((option) => (
                            <Button
                                key={option.value}
                                asChild
                                variant={
                                    option.value === location
                                        ? 'default'
                                        : 'outline'
                                }
                            >
                                <Link
                                    href={menusIndex({
                                        query: { location: option.value },
                                    })}
                                >
                                    {option.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                }
            >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div
                        data-slot="menu-items"
                        className="rounded-xl border bg-card"
                    >
                        {rows.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">
                                This menu is empty. Add an item to replace the
                                automatic page list on the storefront.
                            </p>
                        ) : (
                            <ul className="divide-y">
                                {rows.map((node, index) => (
                                    <li
                                        key={node.id}
                                        draggable
                                        onDragStart={() =>
                                            setDraggedIndex(index)
                                        }
                                        onDragOver={(event) =>
                                            event.preventDefault()
                                        }
                                        onDrop={(event) =>
                                            handleDrop(event, index)
                                        }
                                        onDragEnd={() => setDraggedIndex(null)}
                                        className={
                                            draggedIndex === index
                                                ? 'opacity-50'
                                                : 'opacity-100'
                                        }
                                    >
                                        <MenuRow
                                            item={node}
                                            hasChildren={
                                                node.children.length > 0
                                            }
                                            isEditing={editingId === node.id}
                                            onEdit={() =>
                                                startEditing(node, null)
                                            }
                                            onDelete={() =>
                                                setItemToDelete(node)
                                            }
                                        />

                                        {node.children.length > 0 && (
                                            <ul className="border-t bg-muted/30">
                                                {node.children.map((child) => (
                                                    <li
                                                        key={child.id}
                                                        className="border-b last:border-b-0"
                                                    >
                                                        <MenuRow
                                                            item={child}
                                                            nested
                                                            isEditing={
                                                                editingId ===
                                                                child.id
                                                            }
                                                            onEdit={() =>
                                                                startEditing(
                                                                    child,
                                                                    node.id,
                                                                )
                                                            }
                                                            onDelete={() =>
                                                                setItemToDelete(
                                                                    child,
                                                                )
                                                            }
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <form
                        onSubmit={submit}
                        className="flex h-fit flex-col gap-4 rounded-xl border bg-card p-5"
                    >
                        <h2 className="text-base font-semibold">
                            {editingId ? 'Edit item' : 'Add item'}
                        </h2>

                        <div className="grid gap-2">
                            <Label htmlFor="label">Display name</Label>
                            <Input
                                id="label"
                                value={form.data.label}
                                onChange={(event) =>
                                    form.setData('label', event.target.value)
                                }
                                placeholder="About us"
                            />
                            <InputError message={form.errors.label} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="link_type">Links to</Label>
                            <Select
                                value={form.data.link_type}
                                onValueChange={(value) =>
                                    form.setData('link_type', value as LinkType)
                                }
                            >
                                <SelectTrigger id="link_type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="custom">
                                        Custom URL
                                    </SelectItem>
                                    <SelectItem value="page">Page</SelectItem>
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.link_type} />
                        </div>

                        {isCustom ? (
                            <div className="grid gap-2">
                                <Label htmlFor="url">
                                    URL{' '}
                                    <span className="font-normal text-muted-foreground">
                                        (optional)
                                    </span>
                                </Label>
                                <Input
                                    id="url"
                                    value={form.data.url}
                                    onChange={(event) =>
                                        form.setData('url', event.target.value)
                                    }
                                    placeholder="/services or https://example.com"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Use a path like <code>/blog</code> for this
                                    site, or a full URL to link elsewhere. Leave
                                    it blank for an item that only opens a
                                    dropdown.
                                </p>
                                <InputError message={form.errors.url} />
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="page_id">Page</Label>
                                <Select
                                    value={form.data.page_id}
                                    onValueChange={(value) =>
                                        form.setData('page_id', value)
                                    }
                                >
                                    <SelectTrigger id="page_id">
                                        <SelectValue placeholder="Choose a page" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pages.map((page) => (
                                            <SelectItem
                                                key={page.id}
                                                value={String(page.id)}
                                            >
                                                {page.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    The link follows the page, even if its slug
                                    changes later.
                                </p>
                                <InputError message={form.errors.page_id} />
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="parent_id">Nested under</Label>
                            <Select
                                value={form.data.parent_id}
                                onValueChange={(value) =>
                                    form.setData('parent_id', value)
                                }
                            >
                                <SelectTrigger id="parent_id">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TOP_LEVEL}>
                                        Top level
                                    </SelectItem>
                                    {parentOptions.map((option) => (
                                        <SelectItem
                                            key={option.id}
                                            value={String(option.id)}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={form.errors.parent_id} />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="opens_in_new_tab">
                                Open in a new tab
                            </Label>
                            <Switch
                                id="opens_in_new_tab"
                                checked={form.data.opens_in_new_tab}
                                onCheckedChange={(checked) =>
                                    form.setData('opens_in_new_tab', checked)
                                }
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">
                                Visible on the storefront
                            </Label>
                            <Switch
                                id="is_active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) =>
                                    form.setData('is_active', checked)
                                }
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" disabled={form.processing}>
                                {editingId ? 'Save item' : 'Add item'}
                            </Button>
                            {editingId && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={stopEditing}
                                >
                                    Cancel
                                </Button>
                            )}
                        </div>
                    </form>
                </div>
            </PagePanel>

            {itemToDelete && (
                <ConfirmDialog
                    title="Remove this menu item?"
                    description={
                        <>
                            This removes &ldquo;{itemToDelete.label}&rdquo; from
                            the menu, along with any items nested under it. The
                            pages themselves are not deleted.
                        </>
                    }
                    onConfirm={() =>
                        router.delete(destroyItem(itemToDelete).url, {
                            preserveScroll: true,
                        })
                    }
                    onOpenChange={() => setItemToDelete(null)}
                />
            )}
        </>
    );
}

function MenuRow({
    item,
    nested = false,
    hasChildren = false,
    isEditing,
    onEdit,
    onDelete,
}: {
    item: MenuItemRow;
    nested?: boolean;
    hasChildren?: boolean;
    isEditing: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div
            className={`flex items-center gap-3 px-3 py-3 ${nested ? 'pl-10' : ''} ${isEditing ? 'bg-primary/5' : ''}`}
        >
            {nested ? (
                <CornerDownRight className="size-4 shrink-0 text-muted-foreground" />
            ) : (
                <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
            )}

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.label}</span>
                    {!item.is_active && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-800 uppercase">
                            Hidden
                        </span>
                    )}
                    {item.opens_in_new_tab && (
                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                    {item.href ??
                        // An item with a dropdown but no destination of its own
                        // is a deliberate, working state, not a broken link.
                        (hasChildren ? (
                            'Opens its dropdown only'
                        ) : (
                            <span className="text-red-600">
                                {item.link_type === 'page'
                                    ? 'Linked page is unpublished — hidden from the storefront'
                                    : 'No destination — hidden from the storefront'}
                            </span>
                        ))}
                </p>
            </div>

            <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground uppercase sm:inline">
                {item.link_type === 'page' ? 'Page' : 'Custom'}
            </span>

            <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={onEdit}
            >
                Edit
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={onDelete}
            >
                Delete
            </Button>
        </div>
    );
}

MenusIndex.layout = {
    breadcrumbs: [{ title: 'Menus', href: menusIndex().url }],
};
