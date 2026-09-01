import { Link, router, usePoll } from '@inertiajs/react';
import { CopyPlus, MailPlus } from 'lucide-react';
import { useState } from 'react';

import {
    create as createNewsletter,
    destroy as destroyNewsletter,
    duplicate as duplicateNewsletter,
    edit as editNewsletter,
    index as newslettersIndex,
    send as sendNewsletter,
    show as showNewsletter,
} from '@/actions/App/Http/Controllers/Admin/NewsletterController';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmailQuotaStats } from '@/components/email-quota-stats';
import type { EmailQuotaSummary } from '@/components/email-quota-stats';
import { NewsletterStatusBadge } from '@/components/newsletter-status-badge';
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
import { cn } from '@/lib/utils';

export type NewsletterRow = {
    id: number;
    subject: string;
    status: string;
    status_label: string;
    is_editable: boolean;
    is_in_flight: boolean;
    is_resendable: boolean;
    author: string | null;
    recipient_count: number;
    sent_count: number;
    failed_count: number;
    queued_at: string | null;
    completed_at: string | null;
    created_at: string | null;
};

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

/** Tighter gutters on phones keep the table readable without sideways scrolling. */
const cellPadding = 'px-4 sm:px-6';

function EmptyNewsletters() {
    return (
        <div className="flex flex-col items-center rounded-xl border border-dashed bg-card p-12 text-center shadow-sm">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MailPlus className="size-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No newsletters yet</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Compose one to reach the accounts that signed in with Google.
                Drafts stay editable until you queue them, and every send is
                paced by the daily quota above.
            </p>
            <Button asChild className="mt-6">
                <Link href={createNewsletter.url()}>Compose newsletter</Link>
            </Button>
        </div>
    );
}

export default function NewslettersIndex({
    newsletters,
    emailStats,
}: {
    newsletters: Paginator<NewsletterRow>;
    emailStats: EmailQuotaSummary;
}) {
    const [newsletterToDelete, setNewsletterToDelete] =
        useState<NewsletterRow | null>(null);

    /**
     * The quota moves whenever any email leaves the app, newsletter or not, and a
     * send in progress advances the per-row counts. Only those props are refetched
     * so an idle tab is not re-rendering the whole table every few seconds.
     */
    usePoll(15000, { only: ['emailStats', 'newsletters'] });

    return (
        <>
            <SeoHead title="Newsletters" />

            <PagePanel
                title="Newsletters"
                description="Compose and track mass email to registered users, paced by the daily free-tier send limits."
                variant="transparent"
                actions={
                    <Button asChild className="w-fit">
                        <Link href={createNewsletter.url()}>
                            Compose newsletter
                        </Link>
                    </Button>
                }
            >
                <div className="flex flex-col gap-8">
                    <EmailQuotaStats stats={emailStats} />

                    {newsletters.data.length === 0 ? (
                        <EmptyNewsletters />
                    ) : (
                        <section className="flex flex-col gap-3">
                            <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h2 className="text-base font-semibold">
                                    All newsletters
                                </h2>
                                <span className="text-xs text-muted-foreground">
                                    {newsletters.data.length}{' '}
                                    {newsletters.data.length === 1
                                        ? 'newsletter'
                                        : 'newsletters'}{' '}
                                    on this page
                                </span>
                            </header>

                            <Table className="min-w-0">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className={cellPadding}>
                                            Subject
                                        </TableHead>
                                        <TableHead className={cellPadding}>
                                            Status
                                        </TableHead>
                                        <TableHead className={cellPadding}>
                                            Delivered
                                        </TableHead>
                                        <TableHead
                                            className={cn(
                                                'hidden md:table-cell',
                                                cellPadding,
                                            )}
                                        >
                                            Author
                                        </TableHead>
                                        <TableHead
                                            className={cn(
                                                'hidden sm:table-cell',
                                                cellPadding,
                                            )}
                                        >
                                            Created
                                        </TableHead>
                                        <TableHead
                                            className={cn(
                                                'text-right',
                                                cellPadding,
                                            )}
                                        >
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {newsletters.data.map((newsletter) => (
                                        <TableRow key={newsletter.id}>
                                            <TableCell
                                                className={cn(
                                                    'py-3',
                                                    cellPadding,
                                                )}
                                            >
                                                <Link
                                                    href={showNewsletter.url(
                                                        newsletter.id,
                                                    )}
                                                    className="font-medium text-primary underline-offset-4 hover:underline"
                                                >
                                                    {newsletter.subject}
                                                </Link>
                                                <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                                                    {newsletter.created_at ??
                                                        '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'py-3',
                                                    cellPadding,
                                                )}
                                            >
                                                <NewsletterStatusBadge
                                                    status={newsletter.status}
                                                    label={
                                                        newsletter.status_label
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'py-3 whitespace-nowrap',
                                                    cellPadding,
                                                )}
                                            >
                                                <span className="font-semibold tabular-nums">
                                                    {newsletter.sent_count}
                                                </span>
                                                <span className="text-muted-foreground tabular-nums">
                                                    {' '}
                                                    /{' '}
                                                    {newsletter.recipient_count}
                                                </span>
                                                {newsletter.failed_count >
                                                    0 && (
                                                    <span className="mt-0.5 block text-xs text-destructive tabular-nums">
                                                        {
                                                            newsletter.failed_count
                                                        }{' '}
                                                        failed
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'hidden py-3 text-muted-foreground md:table-cell',
                                                    cellPadding,
                                                )}
                                            >
                                                {newsletter.author ?? '—'}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'hidden py-3 whitespace-nowrap text-muted-foreground sm:table-cell',
                                                    cellPadding,
                                                )}
                                            >
                                                {newsletter.created_at ?? '—'}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'py-3',
                                                    cellPadding,
                                                )}
                                            >
                                                <div className="flex items-center justify-end gap-2">
                                                    {newsletter.is_editable && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={editNewsletter.url(
                                                                        newsletter.id,
                                                                    )}
                                                                >
                                                                    Edit
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        sendNewsletter.url(
                                                                            newsletter.id,
                                                                        ),
                                                                        {},
                                                                        {
                                                                            preserveScroll: true,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                Send
                                                            </Button>
                                                        </>
                                                    )}
                                                    {newsletter.is_resendable && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                router.post(
                                                                    duplicateNewsletter.url(
                                                                        newsletter.id,
                                                                    ),
                                                                    {},
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <CopyPlus className="size-4" />
                                                            Edit &amp; resend
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        disabled={
                                                            newsletter.is_in_flight
                                                        }
                                                        onClick={() =>
                                                            setNewsletterToDelete(
                                                                newsletter,
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/*
                                The list paginates at 15, so without this the
                                sixteenth newsletter is unreachable.
                            */}
                            {newsletters.links &&
                                newsletters.links.length > 3 && (
                                    <nav
                                        className="flex flex-wrap items-center justify-center gap-1 pt-1"
                                        aria-label="Newsletter pages"
                                    >
                                        {newsletters.links.map((link, index) =>
                                            link.url ? (
                                                <Link
                                                    key={index}
                                                    href={link.url}
                                                    aria-current={
                                                        link.active
                                                            ? 'page'
                                                            : undefined
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
                        </section>
                    )}
                </div>
            </PagePanel>

            {newsletterToDelete && (
                <ConfirmDialog
                    title="Delete this newsletter?"
                    description={
                        <>
                            This removes "{newsletterToDelete.subject}" and its
                            delivery record. Mail already sent is unaffected.
                        </>
                    }
                    onConfirm={() =>
                        router.delete(
                            destroyNewsletter.url(newsletterToDelete.id),
                            { preserveScroll: true },
                        )
                    }
                    onOpenChange={() => setNewsletterToDelete(null)}
                />
            )}
        </>
    );
}

NewslettersIndex.layout = {
    breadcrumbs: [{ title: 'Newsletters', href: newslettersIndex().url }],
};
