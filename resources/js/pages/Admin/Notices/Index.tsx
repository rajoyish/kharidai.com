import { Link, router, useForm } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';
import { useState } from 'react';

import {
    destroy as destroyNotice,
    index as noticesIndex,
    store as storeNotice,
    update as updateNotice,
} from '@/actions/App/Http/Controllers/Admin/NoticeController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type NoticeRow = {
    id: number;
    title: string;
    body: string;
    is_published: boolean;
    published_at: string | null;
    author: string | null;
    dismissed_count: number;
    created_at: string | null;
};

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

const emptyForm = {
    title: '',
    body: '',
    is_published: true,
};

export default function NoticesIndex({
    notices,
}: {
    notices: Paginator<NoticeRow>;
}) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<NoticeRow | null>(null);
    const [noticeToDelete, setNoticeToDelete] = useState<NoticeRow | null>(
        null,
    );

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm(emptyForm);

    const openCreate = () => {
        reset();
        clearErrors();
        setEditingNotice(null);
        setIsFormOpen(true);
    };

    const openEdit = (notice: NoticeRow) => {
        clearErrors();
        setData({
            title: notice.title,
            body: notice.body,
            is_published: notice.is_published,
        });
        setEditingNotice(notice);
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingNotice(null);
        reset();
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: closeForm };

        if (editingNotice) {
            put(updateNotice.url(editingNotice.id), options);
        } else {
            post(storeNotice.url(), options);
        }
    };

    return (
        <>
            <SeoHead title="Notices" />

            <PagePanel
                title="Notices"
                description="Announcements that pop up once in each customer's panel and stay on their Notices page. Only accounts that exist when a notice is published receive it."
                variant="transparent"
                actions={
                    <Button onClick={openCreate} className="w-fit">
                        New notice
                    </Button>
                }
            >
                {notices.data.length === 0 ? (
                    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card p-12 text-center shadow-sm">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Megaphone className="size-5" />
                        </div>
                        <h2 className="mt-4 text-lg font-semibold">
                            No notices yet
                        </h2>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            Write one to tell signed-in customers about a change
                            to a product, a policy or your service.
                        </p>
                        <Button onClick={openCreate} className="mt-6">
                            New notice
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {notices.data.map((notice) => (
                            <article
                                key={notice.id}
                                className="rounded-xl border bg-card p-5 shadow-sm"
                            >
                                <header className="flex flex-wrap items-start gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-base font-semibold">
                                                {notice.title}
                                            </h2>
                                            {notice.is_published ? (
                                                <Badge>Published</Badge>
                                            ) : (
                                                <Badge variant="secondary">
                                                    Draft
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {notice.is_published
                                                ? `Published ${notice.published_at}`
                                                : `Created ${notice.created_at}`}
                                            {notice.author &&
                                                ` · by ${notice.author}`}
                                            {notice.is_published &&
                                                ` · dismissed by ${notice.dismissed_count} ${notice.dismissed_count === 1 ? 'user' : 'users'}`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEdit(notice)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                                setNoticeToDelete(notice)
                                            }
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </header>
                                <p className="mt-3 line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                                    {notice.body}
                                </p>
                            </article>
                        ))}

                        {notices.links.length > 3 && (
                            <nav
                                className="flex flex-wrap items-center justify-center gap-1 pt-1"
                                aria-label="Notice pages"
                            >
                                {notices.links.map((link, index) =>
                                    link.url ? (
                                        <Link
                                            key={index}
                                            href={link.url}
                                            aria-current={
                                                link.active ? 'page' : undefined
                                            }
                                            className={cn(
                                                'rounded-md px-3 py-1 text-sm transition-colors',
                                                link.active
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-muted',
                                            )}
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ) : (
                                        <span
                                            key={index}
                                            className="px-3 py-1 text-sm text-muted-foreground opacity-50"
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    ),
                                )}
                            </nav>
                        )}
                    </div>
                )}
            </PagePanel>

            <Dialog
                open={isFormOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        closeForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <DialogHeader>
                            <DialogTitle>
                                {editingNotice ? 'Edit notice' : 'New notice'}
                            </DialogTitle>
                            <DialogDescription>
                                Plain text. Leave a blank line between
                                paragraphs.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-2">
                            <Label htmlFor="notice_title">Title</Label>
                            <Input
                                id="notice_title"
                                value={data.title}
                                onChange={(event) =>
                                    setData('title', event.target.value)
                                }
                                placeholder="e.g. Update on Google AI Pro subscriptions"
                                maxLength={160}
                                required
                            />
                            <InputError message={errors.title} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="notice_body">Message</Label>
                            <Textarea
                                id="notice_body"
                                value={data.body}
                                onChange={(event) =>
                                    setData('body', event.target.value)
                                }
                                rows={10}
                                maxLength={5000}
                                required
                            />
                            <InputError message={errors.body} />
                        </div>

                        <div className="flex items-start gap-3">
                            <Switch
                                id="notice_is_published"
                                checked={data.is_published}
                                onCheckedChange={(checked) =>
                                    setData('is_published', checked)
                                }
                            />
                            <div className="grid gap-0.5">
                                <Label htmlFor="notice_is_published">
                                    Published
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    {editingNotice?.is_published
                                        ? 'Unpublishing hides it from every panel. Publishing it again later sends it as new.'
                                        : 'Customers see it as a popup the next time they open their panel.'}
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeForm}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {editingNotice ? 'Save changes' : 'Save notice'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {noticeToDelete && (
                <ConfirmDialog
                    title="Delete this notice?"
                    description={
                        <>
                            "{noticeToDelete.title}" disappears from every
                            customer's panel. This cannot be undone.
                        </>
                    }
                    onConfirm={() =>
                        router.delete(destroyNotice.url(noticeToDelete.id), {
                            preserveScroll: true,
                        })
                    }
                    onOpenChange={() => setNoticeToDelete(null)}
                />
            )}
        </>
    );
}

NoticesIndex.layout = {
    breadcrumbs: [{ title: 'Notices', href: noticesIndex().url }],
};
