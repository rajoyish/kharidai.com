import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type {
    DragEndEvent,
    DragMoveEvent,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link, router, useForm } from '@inertiajs/react';
import { CornerDownRight, ExternalLink, GripVertical } from 'lucide-react';
import { useMemo, useState } from 'react';

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
import type { FlatMenuItem, MenuProjection } from '@/lib/menu-tree';
import {
    INDENT_WIDTH,
    applyDrag,
    flattenTree,
    getProjection,
    toReorderTree,
} from '@/lib/menu-tree';

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

type MenuNodeRow = MenuItemRow & { children: MenuNodeRow[] };

type FlatRow = FlatMenuItem<MenuItemRow>;

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
    const [activeId, setActiveId] = useState<number | null>(null);

    const form = useForm<MenuForm>(blankForm(location));

    // `rows` is optimistic during a drag; re-sync whenever the server sends
    // fresh props (reorder, save, delete, or a switch of location).
    if (items !== syncedItems) {
        setSyncedItems(items);
        setRows(items);
    }

    const sensors = useSensors(
        // A small distance threshold, so clicking Edit or Delete on a row is not
        // swallowed as the start of a drag.
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const flattened = useMemo(() => flattenTree(rows), [rows]);

    /**
     * The dragged item's own children are lifted out of the sort for its
     * duration, so a parent moves as one piece instead of the sort tearing its
     * dropdown apart.
     */
    const sortable = useMemo(
        () =>
            activeId === null
                ? flattened
                : flattened.filter((item) => item.parentId !== activeId),
        [flattened, activeId],
    );

    const activeItem = flattened.find((item) => item.id === activeId) ?? null;

    const [projection, setProjection] = useState<MenuProjection | null>(null);

    const handleDragStart = ({ active }: DragStartEvent) => {
        setActiveId(Number(active.id));
        setProjection(null);
    };

    /**
     * Horizontal travel is what proposes the nesting depth, which is why the
     * drag is deliberately *not* restricted to the vertical axis: a
     * `restrictToVerticalAxis` modifier zeroes `delta.x` and nesting by drag
     * would silently never work.
     */
    const handleDragMove = ({ delta, over, active }: DragMoveEvent) => {
        if (!over) {
            setProjection(null);

            return;
        }

        setProjection(
            getProjection(
                sortable,
                Number(active.id),
                Number(over.id),
                delta.x,
            ),
        );
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        const current = projection;

        setActiveId(null);
        setProjection(null);

        if (!over || !current) {
            return;
        }

        const next = applyDrag(
            rows,
            Number(active.id),
            Number(over.id),
            current,
        );

        setRows(next);

        router.patch(
            reorder.url(),
            { location, tree: toReorderTree(next) },
            { preserveScroll: true },
        );
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setProjection(null);
    };

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

    const parentOptions = rows.filter((row) => row.id !== editingId);
    const isCustom = form.data.link_type === 'custom';

    return (
        <>
            <SeoHead title="Menu Builder" />

            <PagePanel
                title="Menus"
                variant="transparent"
                description="Build the storefront menus. Drag a row up or down to reorder it, or sideways to nest it under the item above."
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
                        className="rounded-xl border bg-card p-1"
                    >
                        {rows.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">
                                This menu is empty. Add an item to replace the
                                automatic page list on the storefront.
                            </p>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragMove={handleDragMove}
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel}
                            >
                                <SortableContext
                                    items={sortable.map((item) => item.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <ul>
                                        {sortable.map((item) => (
                                            <SortableRow
                                                key={item.id}
                                                item={item}
                                                // While dragging, the row follows
                                                // the pointer's proposed depth, so
                                                // the indent itself is the preview
                                                // of where it will land.
                                                depth={
                                                    item.id === activeId &&
                                                    projection
                                                        ? projection.depth
                                                        : item.depth
                                                }
                                                isEditing={
                                                    editingId === item.id
                                                }
                                                onEdit={() =>
                                                    startEditing(
                                                        item,
                                                        item.parentId,
                                                    )
                                                }
                                                onDelete={() =>
                                                    setItemToDelete(item)
                                                }
                                            />
                                        ))}
                                    </ul>
                                </SortableContext>

                                {/* The row rendered under the cursor. Without it
                                    the dragged row is clipped by the list.

                                    It is a purely visual clone, and it outlives
                                    the drop by the length of the drop animation —
                                    so it is hidden from assistive tech, or its
                                    handle briefly duplicates the real row's. */}
                                <DragOverlay>
                                    {activeItem && (
                                        <div
                                            aria-hidden
                                            className="rounded-lg border bg-card shadow-lg"
                                        >
                                            <MenuRow
                                                item={activeItem}
                                                depth={0}
                                                hasChildren={
                                                    activeItem.hasChildren
                                                }
                                                isDragging
                                            />
                                        </div>
                                    )}
                                </DragOverlay>
                            </DndContext>
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

/** One draggable row. The indent *is* the nesting, so it animates as you drag. */
function SortableRow({
    item,
    depth,
    isEditing,
    onEdit,
    onDelete,
}: {
    item: FlatRow;
    depth: number;
    isEditing: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    return (
        <li
            ref={setNodeRef}
            style={{
                transform: CSS.Translate.toString(transform),
                transition,
                paddingLeft: depth * INDENT_WIDTH,
            }}
            // The original row is left as a gap under the DragOverlay copy.
            className={
                isDragging ? 'opacity-0' : 'transition-[padding] duration-150'
            }
        >
            <MenuRow
                item={item}
                depth={depth}
                hasChildren={item.hasChildren}
                isEditing={isEditing}
                dragHandleProps={{ ...attributes, ...listeners }}
                onEdit={onEdit}
                onDelete={onDelete}
            />
        </li>
    );
}

function MenuRow({
    item,
    depth,
    hasChildren = false,
    isEditing = false,
    isDragging = false,
    dragHandleProps,
    onEdit,
    onDelete,
}: {
    item: MenuItemRow;
    depth: number;
    hasChildren?: boolean;
    isEditing?: boolean;
    isDragging?: boolean;
    dragHandleProps?: Record<string, unknown>;
    onEdit?: () => void;
    onDelete?: () => void;
}) {
    const nested = depth > 0;

    return (
        <div
            className={`flex items-center gap-3 rounded-lg px-3 py-3 ${nested ? 'bg-muted/40' : ''} ${isEditing ? 'bg-primary/5' : ''}`}
        >
            <button
                type="button"
                {...dragHandleProps}
                aria-label={`Reorder ${item.label}`}
                className="shrink-0 cursor-grab touch-none rounded text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
            >
                {nested ? (
                    <CornerDownRight className="size-4" />
                ) : (
                    <GripVertical className="size-4" />
                )}
            </button>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{item.label}</span>
                    {!item.is_active && (
                        <span className="rounded-full bg-warning-surface px-2 py-0.5 text-[10px] font-bold tracking-wider text-warning uppercase">
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

            {!isDragging && (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        aria-label={`Edit ${item.label}`}
                        onClick={onEdit}
                    >
                        Edit
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Delete ${item.label}`}
                        onClick={onDelete}
                    >
                        Delete
                    </Button>
                </>
            )}
        </div>
    );
}

MenusIndex.layout = {
    breadcrumbs: [{ title: 'Menus', href: menusIndex().url }],
};
