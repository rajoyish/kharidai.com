import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import { destroy as destroyCategory } from '@/actions/App/Http/Controllers/Admin/CategoryController';
import { PagePanel } from '@/components/page-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    name: string;
    slug: string;
};

export default function CategoriesIndex({ categories }: { categories: Category[] }) {
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        name: '',
    });

    const handleCreate = () => {
        setIsCreating(true);
        setEditingCategory(null);
        reset();
    };

    const handleEdit = (category: Category) => {
        setEditingCategory(category);
        setIsCreating(false);
        setData({ name: category.name });
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
        if (confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
            setDeletingCategoryId(category.id);

            router.delete(destroyCategory(category), {
                preserveScroll: true,
                onFinish: () => {
                    setDeletingCategoryId(null);
                },
            });
        }
    };

    return (
        <>
            <Head title="Categories Management" />

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
                    <div className="mb-6 p-4 rounded-xl border bg-card shadow-sm">
                        <h3 className="text-lg font-semibold mb-4">
                            {isCreating ? 'Create Category' : 'Edit Category'}
                        </h3>
                        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 sm:items-start">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <Input
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Category Name"
                                    required
                                />
                                {errors.name && <div className="text-sm text-red-500 mt-1">{errors.name}</div>}
                            </div>
                            <div className="flex gap-2 sm:mt-6">
                                <Button type="submit" disabled={processing}>
                                    Save
                                </Button>
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((category) => (
                            <TableRow key={category.id}>
                                <TableCell className="font-medium text-muted-foreground">{category.id}</TableCell>
                                <TableCell className="font-semibold">{category.name}</TableCell>
                                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
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
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={deletingCategoryId === category.id}
                                        onClick={() => handleDelete(category)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
