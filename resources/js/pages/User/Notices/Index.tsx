import { Link } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';

import { index as noticesIndex } from '@/actions/App/Http/Controllers/User/NoticeController';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

type NoticeRow = {
    id: number;
    title: string;
    body: string;
    published_at: string | null;
    is_dismissed: boolean;
};

type Paginator<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
};

export default function NoticesIndex({
    notices,
}: {
    notices: Paginator<NoticeRow>;
}) {
    return (
        <>
            <SeoHead title="Notices" />

            <PagePanel
                title="Notices"
                description="Announcements from the Kharidai team about your purchases and our services."
                variant="transparent"
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
                            Announcements we send you will appear here.
                        </p>
                    </div>
                ) : (
                    <div className="flex max-w-3xl flex-col gap-4">
                        {notices.data.map((notice) => (
                            <article
                                key={notice.id}
                                className="rounded-xl border bg-card p-5 shadow-sm"
                                data-test="notice"
                            >
                                <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <h2 className="text-base font-semibold">
                                        {notice.title}
                                    </h2>
                                    {!notice.is_dismissed && <Badge>New</Badge>}
                                    <span className="text-xs text-muted-foreground sm:ml-auto">
                                        {notice.published_at}
                                    </span>
                                </header>
                                <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
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
        </>
    );
}

NoticesIndex.layout = {
    breadcrumbs: [
        { title: 'Home', href: home() },
        { title: 'Notices', href: noticesIndex() },
    ],
};
