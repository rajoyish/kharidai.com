import { Link, useForm } from '@inertiajs/react';
import { Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { create as composeNewsletter } from '@/actions/App/Http/Controllers/Admin/NewsletterController';
import {
    ban as banUser,
    create as createUser,
    destroy as destroyUser,
    index as usersIndex,
} from '@/actions/App/Http/Controllers/Admin/UserController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { PagePanel } from '@/components/page-panel';
import { SearchFilter } from '@/components/search-filter';
import { SeoHead } from '@/components/seo-head';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function UsersIndex({
    users,
    filters,
}: {
    users: User[];
    filters: { search?: string };
}) {
    const { post, delete: destroy } = useForm();
    /**
     * The user awaiting delete confirmation. One dialog is driven by this value
     * rather than one per row, so the table stays cheap to render.
     */
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    /**
     * Ids ticked for a newsletter. Held as a Set so toggling a row is O(1) and the
     * header checkbox can answer "are all of these selected" without a scan per
     * row.
     */
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    /**
     * Banned accounts are dropped server-side when the send list is built, so
     * offering them here would promise recipients that never get the mail.
     */
    const selectableUsers = useMemo(
        () => users.filter((user) => !user.banned_at),
        [users],
    );

    const allSelected =
        selectableUsers.length > 0 &&
        selectableUsers.every((user) => selectedIds.has(user.id));

    const toggleUser = (id: number) => {
        setSelectedIds((current) => {
            const next = new Set(current);

            if (!next.delete(id)) {
                next.add(id);
            }

            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds(
            allSelected
                ? new Set()
                : new Set(selectableUsers.map((user) => user.id)),
        );
    };

    const handleBan = (user: User) => {
        post(banUser.url(user.id));
    };

    const handleDelete = (user: User) => {
        destroy(destroyUser.url(user.id));
    };

    return (
        <>
            <SeoHead title="User Management" />

            <PagePanel
                title="User Management"
                variant="transparent"
                actions={
                    <div className="flex w-full flex-col items-start gap-4 sm:w-auto sm:flex-row sm:items-center">
                        <SearchFilter
                            href={usersIndex.url()}
                            currentSearch={filters?.search ?? ''}
                            placeholder="Search users..."
                        />
                        <Button
                            asChild={selectedIds.size > 0}
                            variant="outline"
                            className="w-fit"
                            disabled={selectedIds.size === 0}
                        >
                            {selectedIds.size > 0 ? (
                                <Link
                                    href={`${composeNewsletter.url()}?users=${[...selectedIds].join(',')}`}
                                >
                                    <Mail className="size-4" />
                                    Email {selectedIds.size} selected
                                </Link>
                            ) : (
                                <span>
                                    <Mail className="size-4" />
                                    Email selected
                                </span>
                            )}
                        </Button>
                        <Button asChild className="w-fit">
                            <Link href={createUser.url()}>New User</Link>
                        </Button>
                    </div>
                }
            >
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">
                                <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={toggleAll}
                                    disabled={selectableUsers.length === 0}
                                    aria-label="Select all users"
                                />
                            </TableHead>
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
                                <TableCell className="w-12">
                                    <Checkbox
                                        checked={selectedIds.has(user.id)}
                                        onCheckedChange={() =>
                                            toggleUser(user.id)
                                        }
                                        disabled={Boolean(user.banned_at)}
                                        aria-label={`Select ${user.name}`}
                                    />
                                </TableCell>
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
                                        <span className="inline-flex items-center rounded-full border border-transparent bg-success-surface px-2.5 py-0.5 text-xs font-semibold text-success">
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
                                                ? 'text-warning hover:bg-warning/10 hover:text-warning'
                                                : ''
                                        }
                                        onClick={() => handleBan(user)}
                                    >
                                        {user.banned_at ? 'Unban' : 'Ban'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => setUserToDelete(user)}
                                    >
                                        Delete
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    {filters?.search
                                        ? 'No users match your search.'
                                        : 'No users found.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </PagePanel>

            {userToDelete && (
                <ConfirmDialog
                    title="Are you sure you want to delete this user?"
                    description={
                        <>
                            This permanently removes {userToDelete.name} (
                            {userToDelete.email}) and cannot be undone.
                        </>
                    }
                    onConfirm={() => handleDelete(userToDelete)}
                    onOpenChange={() => setUserToDelete(null)}
                />
            )}
        </>
    );
}

UsersIndex.layout = {
    breadcrumbs: [{ title: 'User Management', href: usersIndex().url }],
};
