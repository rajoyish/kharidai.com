import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { destroy as destroyCategory } from '@/actions/App/Http/Controllers/Admin/CategoryController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

type Category = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    type: string | null;
    sort_order: number;
    parent?: { id: number; name: string } | null;
};

type ProductTypeOption = {
    value: string;
    label: string;
};

const selectClassName =
    'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:ring-1 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

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

    const handleCreate = () => {
        setIsCreating(true);
        setEditingCategory(null);
        reset();
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsCreating(false);
        setData({
            name: category.name,
            parent_id: category.parent_id ?? '',
            type: category.type ?? '',
            sort_order: category.sort_order,
        });
    };

    const handleCancel = () => {
        setIsCreating(false);
        setEditingCategory(null);
        reset();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isCreating) {
            post('/admin/categories', {
                onSuccess: () => {
                    handleCancel();
                },
            });
        } else if (editingCategory) {
            patch(`/admin/categories/${editingCategory.slug}`, {
                onSuccess: () => {
                    handleCancel();
                },
            });
        }
    };

    const handleDelete = (category: Category) => {
        if (
            confirm(
                `Are you sure you want to delete the category "${category.name}"?`,
            )
        ) {
            setDeletingCategoryId(category.id);

            router.delete(destroyCategory(category), {
                preserveScroll: true,
                onFinish: () => {
                    setDeletingCategoryId(null);
                },
            });
        }
    };

    // Parent options exclude the category currently being edited so it cannot
    // be nested under itself (deeper cycles are rejected server-side).
    const parentOptions = categories.filter(
        (category) => category.id !== editingCategory?.id,
    );

    return (
        <>
            <SeoHead title="Categories Management" />

            <PagePanel
                title="Categories"
                variant="transparent"
                actions={
                    <Button onClick={handleCreate} className="w-full sm:w-auto">
                        Add Category
                    </Button>
                }
            >
                {(isCreating || editingCategory) && (
                    <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
                        <h3 className="mb-4 text-lg font-semibold">
                            {isCreating ? 'Create Category' : 'Edit Category'}
                        </h3>
                        <form
                            onSubmit={handleSubmit}
                            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
                        >
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder="Category Name"
                                    required
                                />
                                {errors.name && (
                                    <div className="text-sm text-red-500">
                                        {errors.name}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="parent_id">
                                    Parent category
                                </Label>
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
                                    {parentOptions.map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.parent_id && (
                                    <div className="text-sm text-red-500">
                                        {errors.parent_id}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
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
                                    <div className="text-sm text-red-500">
                                        {errors.type}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1">
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
                                    <div className="text-sm text-red-500">
                                        {errors.sort_order}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                                <Button type="submit" disabled={processing}>
                                    Save
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Sort</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-semibold">
                                    {category.parent_id && (
                                        <span className="mr-1 text-muted-foreground">
                                            └
                                        </span>
                                    )}
                                    {category.name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {category.parent?.name ?? '—'}
                                </TableCell>
                                <TableCell className="capitalize text-muted-foreground">
                                    {category.type ?? 'Any'}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {category.sort_order}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {category.slug}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEdit(category)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        disabled={
                                            deletingCategoryId === category.id
                                        }
                                        onClick={() => handleDelete(category)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No categories found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

CategoriesIndex.layout = {
    breadcrumbs: [{ title: 'Categories', href: '/admin/categories' }],
};
