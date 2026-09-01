import { router, usePoll } from '@inertiajs/react';
import { CopyPlus } from 'lucide-react';
import { useEffect } from 'react';

import {
    duplicate as duplicateNewsletter,
    index as newslettersIndex,
} from '@/actions/App/Http/Controllers/Admin/NewsletterController';
import { CmsContent } from '@/components/cms-content';
import { EmailQuotaStats } from '@/components/email-quota-stats';
import type { EmailQuotaSummary } from '@/components/email-quota-stats';
import { NewsletterStatusBadge } from '@/components/newsletter-status-badge';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { NewsletterRow } from '@/pages/Admin/Newsletters/Index';

type RecipientRow = {
    id: number;
    name: string | null;
    email: string;
    status: string;
    status_label: string;
    mailer: string | null;
    sent_at: string | null;
    error: string | null;
};

type Paginator<T> = {
    data: T[];
};

const RECIPIENT_VARIANTS: Record<
    string,
    'success' | 'warning' | 'danger' | 'neutral'
> = {
    sent: 'success',
    pending: 'warning',
    failed: 'danger',
    // Withheld on purpose, not a failure: the address turned out to be an
    // admin's or one of the app's own by the time the job ran.
    skipped: 'neutral',
};

export default function ShowNewsletter({
    newsletter,
    recipients,
    emailStats,
}: {
    newsletter: NewsletterRow & { body: string };
    recipients: Paginator<RecipientRow>;
    emailStats: EmailQuotaSummary;
}) {
    const { start, stop } = usePoll(
        10000,
        { only: ['newsletter', 'recipients', 'emailStats'] },
        { autoStart: newsletter.is_in_flight },
    );

    // A send in flight advances a few rows a tick. Once it has finished the page
    // is static, so the poll stops rather than waking the server forever.
    useEffect(() => {
        if (newsletter.is_in_flight) {
            start();

            return;
        }

        stop();
    }, [newsletter.is_in_flight, start, stop]);

    return (
        <>
            <SeoHead title={newsletter.subject} />

            <PagePanel
                title={newsletter.subject}
                variant="transparent"
                actions={
                    <div className="flex items-center gap-3">
                        <NewsletterStatusBadge
                            status={newsletter.status}
                            label={newsletter.status_label}
                        />
                        {newsletter.is_resendable && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.post(
                                        duplicateNewsletter.url(newsletter.id),
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                <CopyPlus className="size-4" />
                                Edit &amp; resend
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
                    <div className="flex min-w-0 flex-col gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Delivery</CardTitle>
                                <CardDescription>
                                    {newsletter.sent_count} of{' '}
                                    {newsletter.recipient_count} delivered
                                    {newsletter.failed_count > 0 &&
                                        `, ${newsletter.failed_count} failed`}
                                    {newsletter.queued_at &&
                                        ` · queued ${newsletter.queued_at}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Recipient</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Sent via</TableHead>
                                            <TableHead>When</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recipients.data.map((recipient) => (
                                            <TableRow key={recipient.id}>
                                                <TableCell>
                                                    <span className="block font-medium">
                                                        {recipient.name ?? '—'}
                                                    </span>
                                                    <span className="block text-xs text-muted-foreground">
                                                        {recipient.email}
                                                    </span>
                                                    {recipient.error && (
                                                        <span className="mt-1 block text-xs text-destructive">
                                                            {recipient.error}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            RECIPIENT_VARIANTS[
                                                                recipient.status
                                                            ] ?? 'neutral'
                                                        }
                                                        className="rounded-full"
                                                    >
                                                        {recipient.status_label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="capitalize">
                                                    {recipient.mailer ?? '—'}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    {recipient.sent_at ?? '—'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Message</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CmsContent content={newsletter.body} />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:sticky lg:top-6 lg:self-start">
                        <EmailQuotaStats stats={emailStats} />
                    </div>
                </div>
            </PagePanel>
        </>
    );
}

ShowNewsletter.layout = {
    breadcrumbs: [
        { title: 'Newsletters', href: newslettersIndex().url },
        { title: 'Delivery', href: '#' },
    ],
};
