import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

import { PagePanel } from '@/components/page-panel';

type User = {
    id: number;
    name: string;
    email: string;
    is_admin: boolean;
    banned_at: string | null;
    created_at: string;
};

export default function UsersIndex({ users }: { users: User[] }) {
    const { post, delete: destroy } = useForm();

    const handleBan = (user: User) => {
        post(`/admin/users/${user.id}/ban`);
    };

    const handleDelete = (user: User) => {
        if (confirm('Are you sure you want to delete this user?')) {
            destroy(`/admin/users/${user.id}`);
        }
    };

    return (
        <>
            <Head title="User Management" />

            <PagePanel title="User Management">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr
                                    key={user.id}
                                    className="border-b last:border-0"
                                >
                                    <td className="px-6 py-4 font-medium">
                                        {user.name}{' '}
                                        {user.is_admin ? '(Admin)' : ''}
                                    </td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        {user.banned_at ? (
                                            <span className="text-destructive">
                                                Banned
                                            </span>
                                        ) : (
                                            <span className="text-green-500">
                                                Active
                                            </span>
                                        )}
                                    </td>
                                    <td className="flex gap-2 px-6 py-4">
                                        <Button
                                            variant={
                                                user.banned_at
                                                    ? 'outline'
                                                    : 'destructive'
                                            }
                                            size="sm"
                                            onClick={() => handleBan(user)}
                                        >
                                            {user.banned_at ? 'Unban' : 'Ban'}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(user)}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
            </PagePanel>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'User Management', href: '/admin/users' }],
};
