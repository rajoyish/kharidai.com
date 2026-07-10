import { Link, useForm } from '@inertiajs/react';
import {
    ban as banUser,
    create as createUser,
    destroy as destroyUser,
    index as usersIndex,
} from '@/actions/App/Http/Controllers/Admin/UserController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { WhatsappContactAction } from '@/components/whatsapp-contact-action';

type User = {
    id: number;
    name: string;
    email: string;
    mobile_number: string | null;
    is_admin: boolean;
    banned_at: string | null;
    created_at: string | null;
    created_at_relative: string | null;
    created_at_absolute: string | null;
    last_active_at: string | null;
    last_active_relative: string | null;
    last_active_absolute: string | null;
};

function UserDateCell({
    absolute,
    relative,
    emptyLabel = '—',
}: {
    absolute: string | null;
    relative: string | null;
    emptyLabel?: string;
}) {
    if (!relative || !absolute) {
        return <span className="text-muted-foreground">{emptyLabel}</span>;
    }

    return (
        <div className="flex flex-col gap-1 whitespace-nowrap">
            <span>{relative}</span>
            <span className="text-xs text-muted-foreground">{absolute}</span>
        </div>
    );
}

export default function UsersIndex({ users }: { users: User[] }) {
    const { post, delete: destroy } = useForm();

    const handleBan = (user: User) => {
        post(banUser.url(user.id));
    };

    const handleDelete = (user: User) => {
        if (confirm('Are you sure you want to delete this user?')) {
            destroy(destroyUser.url(user.id));
        }
    };

    return (
        <>
            <SeoHead title="User Management" />

            <PagePanel
                title="User Management"
                variant="transparent"
                actions={
                    <Button asChild className="w-fit">
                        <Link href={createUser.url()}>New User</Link>
                    </Button>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Mobile</TableHead>
                            <TableHead>Created at</TableHead>
                            <TableHead>Last Active</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                    {user.name} {user.is_admin ? '(Admin)' : ''}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                        <span>{user.mobile_number || '-'}</span>
                                        <WhatsappContactAction
                                            name={user.name}
                                            mobileNumber={user.mobile_number}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <UserDateCell
                                        absolute={user.created_at_absolute}
                                        relative={user.created_at_relative}
                                    />
                                </TableCell>
                                <TableCell>
                                    <UserDateCell
                                        absolute={user.last_active_absolute}
                                        relative={user.last_active_relative}
                                        emptyLabel="Never"
                                    />
                                </TableCell>
                                <TableCell>
                                    {user.banned_at ? (
                                        <span className="inline-flex items-center rounded-full border border-transparent bg-destructive px-2.5 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-destructive/80 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none">
                                            Banned
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center rounded-full border border-transparent bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800 transition-colors hover:bg-green-100/80 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none">
                                            Active
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="flex justify-end gap-2">
                                    <Button
                                        variant={
                                            user.banned_at ? 'outline' : 'ghost'
                                        }
                                        size="sm"
                                        className={
                                            !user.banned_at
                                                ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                                                : ''
                                        }
                                        onClick={() => handleBan(user)}
                                    >
                                        {user.banned_at ? 'Unban' : 'Ban'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleDelete(user)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={7}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'User Management', href: usersIndex() }],
};
