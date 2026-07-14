import { expect, test } from '@playwright/test';

import {
    INDENT_WIDTH,
    applyDrag,
    buildTree,
    flattenTree,
    getProjection,
    toReorderTree,
} from '../../resources/js/lib/menu-tree';
import type { MenuTreeNode } from '../../resources/js/lib/menu-tree';

type Node = MenuTreeNode<{ label: string }>;

function node(id: number, label: string, children: Node[] = []): Node {
    return { id, label, children };
}

/**
 * Home        (1)
 * Policies    (2)
 *   ├─ Privacy (3)
 *   └─ Refund  (4)
 * Blog        (5)
 */
function tree(): Node[] {
    return [
        node(1, 'Home'),
        node(2, 'Policies', [node(3, 'Privacy'), node(4, 'Refund')]),
        node(5, 'Blog'),
    ];
}

const shape = (rows: Node[]) =>
    rows.map((row) => [row.label, row.children.map((child) => child.label)]);

/** The projection the UI would compute for a drag, then the resulting tree. */
function drag(activeId: number, overId: number, offsetX = 0) {
    const rows = tree();
    // The dragged item's children never take part in the sort, exactly as the
    // component removes them for the duration of the drag.
    const sortable = flattenTree(rows).filter(
        (item) => item.parentId !== activeId,
    );
    const projection = getProjection(sortable, activeId, overId, offsetX);

    return applyDrag(rows, activeId, overId, projection);
}

test.describe('menu tree', () => {
    test('flattens depth-first, tagging depth and parent', () => {
        expect(
            flattenTree(tree()).map((item) => [
                item.label,
                item.depth,
                item.parentId,
                item.hasChildren,
            ]),
        ).toEqual([
            ['Home', 0, null, false],
            ['Policies', 0, null, true],
            ['Privacy', 1, 2, false],
            ['Refund', 1, 2, false],
            ['Blog', 0, null, false],
        ]);
    });

    test('rebuilding a flattened tree is lossless', () => {
        expect(shape(buildTree(flattenTree(tree())))).toEqual(shape(tree()));
    });

    test('promotes a nested item that has no parent above it', () => {
        // Defensive: an orphan is lifted to the top level rather than vanishing
        // from the menu.
        const orphaned = flattenTree(tree()).filter(
            (item) => item.label !== 'Policies',
        );

        expect(shape(buildTree(orphaned))).toEqual([
            ['Home', []],
            ['Privacy', []],
            ['Refund', []],
            ['Blog', []],
        ]);
    });

    test('reorders top-level items', () => {
        expect(shape(drag(5, 1))).toEqual([
            ['Blog', []],
            ['Home', []],
            ['Policies', ['Privacy', 'Refund']],
        ]);
    });

    test('reorders items inside a dropdown', () => {
        expect(shape(drag(4, 3))).toEqual([
            ['Home', []],
            ['Policies', ['Refund', 'Privacy']],
            ['Blog', []],
        ]);
    });

    test('dragging sideways nests an item under the one above', () => {
        // Blog dropped onto Refund's slot, pushed one indent right.
        expect(shape(drag(5, 4, INDENT_WIDTH))).toEqual([
            ['Home', []],
            ['Policies', ['Privacy', 'Blog', 'Refund']],
        ]);
    });

    test('dragging left lifts a child back out to the top level', () => {
        // Privacy dragged up to Policies' slot and pulled left.
        expect(shape(drag(3, 2, -INDENT_WIDTH))).toEqual([
            ['Home', []],
            ['Privacy', []],
            ['Policies', ['Refund']],
            ['Blog', []],
        ]);
    });

    test('a parent keeps its dropdown when it is dragged', () => {
        // Policies carries Privacy and Refund with it rather than being torn
        // apart by the sort.
        expect(shape(drag(2, 1))).toEqual([
            ['Policies', ['Privacy', 'Refund']],
            ['Home', []],
            ['Blog', []],
        ]);
    });

    test('refuses to nest an item that already has a dropdown', () => {
        // Menus are two levels deep, so however far right Policies is dragged it
        // stays at the top level.
        const rows = tree();
        const sortable = flattenTree(rows).filter(
            (item) => item.parentId !== 2,
        );

        expect(getProjection(sortable, 2, 1, INDENT_WIDTH * 3)).toEqual({
            depth: 0,
            parentId: null,
        });
    });

    test('cannot sit shallower than the item below it', () => {
        // Dropping between Policies and its first child would strand the child,
        // so the depth is forced to 1 no matter how far left it is dragged.
        const rows = tree();
        const sortable = flattenTree(rows).filter(
            (item) => item.parentId !== 5,
        );
        const projection = getProjection(sortable, 5, 3, -INDENT_WIDTH * 3);

        expect(projection).toEqual({ depth: 1, parentId: 2 });
    });

    test('serialises the tree to the ids the reorder endpoint expects', () => {
        expect(toReorderTree(tree())).toEqual([
            { id: 1, children: [] },
            { id: 2, children: [{ id: 3 }, { id: 4 }] },
            { id: 5, children: [] },
        ]);
    });
});
