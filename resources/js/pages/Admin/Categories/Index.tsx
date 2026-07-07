import { router, useForm } from '@inertiajs/react';
import {
    CornerDownRight,
    FolderTree,
    Hash,
    Layers,
    Package,
    Pencil,
    Plus,
    Tag,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    destroy as destroyCategory,
    store as storeCategory,
    update as updateCategory,
} from '@/actions/App/Http/Controllers/Admin/CategoryController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Category = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    type: string | null;
    sort_order: number;
    parent?: { id: number; name: string } | null;
    /** Total product variants across products directly assigned to this category. */
    product_variants_count?: number;
};

type ProductTypeOption = {
    value: string;
    label: string;
};

type CategoryNode = Category & { children: CategoryNode[] };

const selectClassName =
    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Build a nested tree from the flat, server-ordered category list so the UI can
 * render parents with their subcategories grouped underneath. Categories whose
 * parent is missing are surfaced at the root instead of being hidden.
 */
function buildTree(categories: Category[]): CategoryNode[] {
    const nodes = new Map<number, CategoryNode>();
    categories.forEach((category) => {
        nodes.set(category.id, { ...category, children: [] });
    });

    const roots: CategoryNode[] = [];
    categories.forEach((category) => {
        const node = nodes.get(category.id)!;
        const parent =
            category.parent_id !== null
                ? nodes.get(category.parent_id)
                : undefined;

        if (parent) {
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    });

    return roots;
}

/** Flatten the tree in display order, tracking depth for indented select options. */
function flatten(
    nodes: CategoryNode[],
    depth = 0,
): Array<{ category: CategoryNode; depth: number }> {
    return nodes.flatMap((node) => [
        { category: node, depth },
        ...flatten(node.children, depth + 1),
    ]);
}

/** Count every descendant beneath a node. */
function countDescendants(node: CategoryNode): number {
    return node.children.reduce(
        (total, child) => total + 1 + countDescendants(child),
        0,
    );
}

export default function CategoriesIndex({
    categories,
    productTypes,
}: {
    categories: Category[];
    productTypes: ProductTypeOption[];
}) {
    const [editingCategory, setEditingCategory] = useState<Category | null>(
        null,
    );
    const [isCreating, setIsCreating] = useState(false);
    const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(
        null,
    );

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
        parent_id: '' as number | '',
        type: '' as string,
        sort_order: 0 as number,
    });

    const tree = useMemo(() => buildTree(categories), [categories]);
    const topLevelCount = tree.length;
    const subCount = categories.length - topLevelCount;
    const totalItemCount = useMemo(
        () =>
            categories.reduce(
                (total, category) =>
                    total + (category.product_variants_count ?? 0),
                0,
            ),
        [categories],
    );

    const isDialogOpen = isCreating || editingCategory !== null;

    const openCreate = () => {
        reset();
        setEditingCategory(null);
        setIsCreating(true);
    };

    const openEdit = (category: Category) => {
        setIsCreating(false);
        setEditingCategory(category);
        setData({
            name: category.name,
            parent_id: category.parent_id ?? '',
            type: category.type ?? '',
            sort_order: category.sort_order,
        });
    };

    const closeDialog = () => {
        setIsCreating(false);
        setEditingCategory(null);
        reset();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isCreating) {
            post(storeCategory.url(), { onSuccess: closeDialog });
        } else if (editingCategory) {
            patch(updateCategory(editingCategory).url, {
                onSuccess: closeDialog,
            });
        }
    };

    const handleDelete = (category: Category) => {
        if (
            !confirm(
                `Are you sure you want to delete the category "${category.name}"?`,
            )
        ) {
            return;
        }

        setDeletingCategoryId(category.id);
        router.delete(destroyCategory(category), {
            preserveScroll: true,
            onFinish: () => setDeletingCategoryId(null),
        });
    };

    // Parent options exclude the category being edited so it cannot be nested
    // under itself (deeper cycles are rejected server-side). Depth drives the
    // indentation prefix so the hierarchy reads clearly in the dropdown.
    const parentOptions = useMemo(
        () =>
            flatten(tree).filter(
                ({ category }) => category.id !== editingCategory?.id,
            ),
        [tree, editingCategory],
    );

    return (
        <>
            <SeoHead title="Categories Management" />

            <PagePanel
                title="Categories"
                description="Organize your catalog into a tidy, nested hierarchy."
                variant="transparent"
                actions={
                    <Button onClick={openCreate} className="w-fit">
                        <Plus className="size-4" />
                        Add Category
                    </Button>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-3">
                        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <FolderTree className="size-5" />
                            </div>
                            <div>
                                <div className="text-2xl leading-none font-bold">
                                    {topLevelCount}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Top-level
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Layers className="size-5" />
                            </div>
                            <div>
                                <div className="text-2xl leading-none font-bold">
                                    {subCount}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Subcategories
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Package className="size-5" />
                            </div>
                            <div>
                                <div className="text-2xl leading-none font-bold">
                                    {totalItemCount}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                    Items
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                        {tree.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <FolderTree className="size-6" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        No categories yet
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Create your first category to start
                                        organizing your catalog.
                                    </p>
                                </div>
                                <Button
                                    onClick={openCreate}
                                    variant="outline"
                                    className="mt-1"
                                >
                                    <Plus className="size-4" />
                                    Add Category
                                </Button>
                            </div>
                        ) : (
                            <ul className="divide-y">
                                {tree.map((node) => (
                                    <CategoryRow
                                        key={node.id}
                                        node={node}
                                        depth={0}
                                        deletingCategoryId={deletingCategoryId}
                                        onEdit={openEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </PagePanel>

            <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeDialog();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {isCreating ? 'Create Category' : 'Edit Category'}
                        </DialogTitle>
                        <DialogDescription>
                            {isCreating
                                ? 'Add a new category and optionally nest it under a parent.'
                                : `Update the details for "${editingCategory?.name}".`}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
                                }
                                placeholder="e.g. Clothes"
                                autoFocus
                                required
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <Label htmlFor="parent_id">Parent category</Label>
                            <select
                                id="parent_id"
                                className={selectClassName}
                                value={data.parent_id}
                                onChange={(e) =>
                                    setData(
                                        'parent_id',
                                        e.target.value
                                            ? Number(e.target.value)
                                            : '',
                                    )
                                }
                            >
                                <option value="">None (top level)</option>
                                {parentOptions.map(({ category, depth }) => (
                                    <option
                                        key={category.id}
                                        value={category.id}
                                    >
                                        {`${'  '.repeat(depth)}${
                                            depth > 0 ? '└ ' : ''
                                        }${category.name}`}
                                    </option>
                                ))}
                            </select>
                            {errors.parent_id && (
                                <p className="text-sm text-red-500">
                                    {errors.parent_id}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="type">Type</Label>
                            <select
                                id="type"
                                className={selectClassName}
                                value={data.type}
                                onChange={(e) =>
                                    setData('type', e.target.value)
                                }
                            >
                                <option value="">Any</option>
                                {productTypes.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.type && (
                                <p className="text-sm text-red-500">
                                    {errors.type}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="sort_order">Sort order</Label>
                            <Input
                                id="sort_order"
                                type="number"
                                min={0}
                                value={data.sort_order}
                                onChange={(e) =>
                                    setData(
                                        'sort_order',
                                        Number(e.target.value),
                                    )
                                }
                            />
                            {errors.sort_order && (
                                <p className="text-sm text-red-500">
                                    {errors.sort_order}
                                </p>
                            )}
                        </div>

                        <DialogFooter className="sm:col-span-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeDialog}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {isCreating ? 'Create' : 'Save changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

function CategoryRow({
    node,
    depth,
    deletingCategoryId,
    onEdit,
    onDelete,
}: {
    node: CategoryNode;
    depth: number;
    deletingCategoryId: number | null;
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
}) {
    const isChild = depth > 0;
    const childCount = countDescendants(node);
    const itemCount = node.product_variants_count ?? 0;

    return (
        <li>
            <div
                className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 sm:px-4"
                style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
            >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                        className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-md',
                            isChild
                                ? 'text-muted-foreground'
                                : 'bg-primary/10 text-primary',
                        )}
                    >
                        {isChild ? (
                            <CornerDownRight className="size-4" />
                        ) : (
                            <FolderTree className="size-4" />
                        )}
                    </span>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={cn(
                                    'truncate',
                                    isChild ? 'font-medium' : 'font-semibold',
                                )}
                            >
                                {node.name}
                            </span>
                            {node.type && (
                                <Badge
                                    variant="secondary"
                                    className="capitalize"
                                >
                                    <Tag className="size-3" />
                                    {node.type}
                                </Badge>
                            )}
                            {childCount > 0 && (
                                <Badge variant="outline">
                                    {childCount}{' '}
                                    {childCount === 1 ? 'sub' : 'subs'}
                                </Badge>
                            )}
                            <Badge variant="outline" className="gap-1">
                                <Package className="size-3" />
                                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate font-mono">
                                /{node.slug}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                                <Hash className="size-3" />
                                {node.sort_order}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={`Edit ${node.name}`}
                        onClick={() => onEdit(node)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                        aria-label={`Delete ${node.name}`}
                        disabled={deletingCategoryId === node.id}
                        onClick={() => onDelete(node)}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            {node.children.length > 0 && (
                <ul className="divide-y border-t">
                    {node.children.map((child) => (
                        <CategoryRow
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            deletingCategoryId={deletingCategoryId}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [{ title: 'Categories', href: '/admin/categories' }],
};
