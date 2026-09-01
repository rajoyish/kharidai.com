import { Link, router, usePoll } from '@inertiajs/react';
import { CopyPlus } from 'lucide-react';
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
import {
    EmailQuotaStats
    
} from '@/components/email-quota-stats';
import type {EmailQuotaSummary} from '@/components/email-quota-stats';
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
                variant="transparent"
                actions={
                    <Button asChild className="w-fit">
                        <Link href={createNewsletter.url()}>
                            Compose newsletter
                        </Link>
                    </Button>
                }
            >
                <div className="flex flex-col gap-6">
                    <EmailQuotaStats stats={emailStats} />

                    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Delivered</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {newsletters.data.map((newsletter) => (
                                    <TableRow key={newsletter.id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={showNewsletter.url(
                                                    newsletter.id,
                                                )}
                                                className="hover:underline"
                                            >
                                                {newsletter.subject}
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            <NewsletterStatusBadge
                                                status={newsletter.status}
                                                label={
                                                    newsletter.status_label
                                                }
                                            />
                                        </TableCell>
                                        <TableCell className="tabular-nums whitespace-nowrap">
                                            {newsletter.sent_count} /{' '}
                                            {newsletter.recipient_count}
                                            {newsletter.failed_count > 0 && (
                                                <span className="ml-2 text-xs text-destructive">
                                                    {newsletter.failed_count}{' '}
                                                    failed
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {newsletter.author ?? '—'}
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap">
                                            {newsletter.created_at ?? '—'}
                                        </TableCell>
                                        <TableCell className="flex justify-end gap-2">
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
                                                                    preserveScroll:
                                                                        true,
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
                                                                preserveScroll:
                                                                    true,
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
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {newsletters.data.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            No newsletters yet. Compose one and
                                            pick who it goes to.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
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
