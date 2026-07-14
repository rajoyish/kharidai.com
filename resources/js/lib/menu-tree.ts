import { arrayMove } from '@dnd-kit/sortable';

/**
 * Tree maths behind the admin menu builder's drag-and-drop.
 *
 * Dragging operates on a *flattened* list rather than the nested tree: that is
 * what lets one vertical sort handle both levels, and it is the shape dnd-kit's
 * sortable wants. The tree is rebuilt from the flat list on drop.
 *
 * Kept out of the component so the index arithmetic is testable — it is exactly
 * the kind of thing that is quietly wrong until it is pinned.
 */

/** Menus nest one level: a top-level item and its dropdown. */
export const MAX_DEPTH = 1;

/** How far one nesting level is indented, in pixels. Mirrors the row's padding. */
export const INDENT_WIDTH = 40;

export type MenuTreeNode<T> = T & {
    id: number;
    children: MenuTreeNode<T>[];
};

export type FlatMenuItem<T> = T & {
    id: number;
    parentId: number | null;
    depth: number;
    hasChildren: boolean;
};

/** Where a dragged item would land: how deep, and under whom. */
export type MenuProjection = {
    depth: number;
    parentId: number | null;
};

/** Depth-first, so the flat order is exactly the order rows are rendered in. */
export function flattenTree<T>(rows: MenuTreeNode<T>[]): FlatMenuItem<T>[] {
    return rows.flatMap((row) => [
        {
            ...row,
            parentId: null,
            depth: 0,
            hasChildren: row.children.length > 0,
        },
        ...row.children.map((child) => ({
            ...child,
            parentId: row.id,
            depth: 1,
            hasChildren: false,
        })),
    ]);
}

/**
 * Rebuilds the nested tree from a flat list. A nested item with no parent above
 * it is promoted rather than dropped, so no item can ever fall out of the menu.
 */
export function buildTree<T>(items: FlatMenuItem<T>[]): MenuTreeNode<T>[] {
    const rows: MenuTreeNode<T>[] = [];

    for (const item of items) {
        const node = { ...item, children: [] } as unknown as MenuTreeNode<T>;
        const parent = rows.find((row) => row.id === item.parentId);

        if (item.depth > 0 && parent) {
            parent.children.push(node);
        } else {
            rows.push(node);
        }
    }

    return rows;
}

/**
 * Where the drag would land, given how far it has been dragged sideways.
 *
 * `depth` is proposed by the horizontal offset, then clamped by what the
 * neighbours allow: you cannot nest deeper than one below the item above, and
 * you cannot sit shallower than the item below (that would strand it from its
 * parent). An item that carries its own dropdown can only ever be top level.
 */
export function getProjection<T>(
    items: FlatMenuItem<T>[],
    activeId: number,
    overId: number,
    dragOffsetX: number,
): MenuProjection {
    const activeIndex = items.findIndex((item) => item.id === activeId);
    const overIndex = items.findIndex((item) => item.id === overId);

    if (activeIndex === -1 || overIndex === -1) {
        return { depth: 0, parentId: null };
    }

    const activeItem = items[activeIndex];
    const reordered = arrayMove(items, activeIndex, overIndex);
    const previousItem = reordered[overIndex - 1];
    const nextItem = reordered[overIndex + 1];

    const dragDepth = Math.round(dragOffsetX / INDENT_WIDTH);
    const projectedDepth = activeItem.depth + dragDepth;

    // A parent dragged into a dropdown would push its children to a third level.
    const maxDepth = activeItem.hasChildren
        ? 0
        : previousItem
          ? Math.min(previousItem.depth + 1, MAX_DEPTH)
          : 0;
    const minDepth = nextItem ? nextItem.depth : 0;

    const depth = Math.max(Math.min(projectedDepth, maxDepth), minDepth);

    if (depth === 0) {
        return { depth: 0, parentId: null };
    }

    // At depth 1 the parent is whichever top-level item is nearest above.
    const parent =
        previousItem?.depth === 0
            ? previousItem
            : reordered
                  .slice(0, overIndex)
                  .reverse()
                  .find((item) => item.depth === 0);

    return { depth: parent ? 1 : 0, parentId: parent?.id ?? null };
}

/**
 * Applies a completed drag, returning the new tree.
 *
 * The dragged item's own children never take part in the sort — they are lifted
 * out for the duration and re-attached here — so dragging a parent moves its
 * whole dropdown with it, rather than letting the sort tear it apart.
 */
export function applyDrag<T>(
    rows: MenuTreeNode<T>[],
    activeId: number,
    overId: number,
    projection: MenuProjection,
): MenuTreeNode<T>[] {
    const flat = flattenTree(rows);
    const sortable = flat.filter((item) => item.parentId !== activeId);
    const detachedChildren =
        rows.find((row) => row.id === activeId)?.children ?? [];

    const activeIndex = sortable.findIndex((item) => item.id === activeId);
    const overIndex = sortable.findIndex((item) => item.id === overId);

    if (activeIndex === -1 || overIndex === -1) {
        return rows;
    }

    const reordered = arrayMove(sortable, activeIndex, overIndex).map((item) =>
        item.id === activeId
            ? {
                  ...item,
                  depth: projection.depth,
                  parentId: projection.parentId,
              }
            : item,
    );

    const tree = buildTree(reordered);
    const moved = tree.find((row) => row.id === activeId);

    if (moved) {
        moved.children = detachedChildren;
    }

    return tree;
}

/** The payload the reorder endpoint expects: ids, nested one level. */
export function toReorderTree<T>(
    rows: MenuTreeNode<T>[],
): { id: number; children: { id: number }[] }[] {
    return rows.map((row) => ({
        id: row.id,
        children: row.children.map((child) => ({ id: child.id })),
    }));
}
