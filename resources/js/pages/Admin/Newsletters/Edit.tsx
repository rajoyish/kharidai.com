import {
    index as newslettersIndex,
    update,
} from '@/actions/App/Http/Controllers/Admin/NewsletterController';
import type { EmailQuotaSummary } from '@/components/email-quota-stats';
import {
    NewsletterComposer
    
} from '@/components/newsletter-composer';
import type {NewsletterRecipientOption} from '@/components/newsletter-composer';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';

type NewsletterDraft = {
    id: number;
    subject: string;
    body: string;
};

export default function EditNewsletter({
    newsletter,
    selectedUsers,
    audienceCount,
    emailStats,
}: {
    newsletter: NewsletterDraft;
    selectedUsers: NewsletterRecipientOption[];
    audienceCount: number;
    emailStats: EmailQuotaSummary;
}) {
    return (
        <>
            <SeoHead title="Edit Newsletter" />

            <PagePanel
                title="Edit draft"
                description="Only drafts can be edited. Once a newsletter is queued its body is locked."
                variant="transparent"
            >
                <NewsletterComposer
                    submitUrl={update.url(newsletter.id)}
                    cancelUrl={newslettersIndex.url()}
                    newsletter={newsletter}
                    selectedUsers={selectedUsers}
                    audienceCount={audienceCount}
                    emailStats={emailStats}
                />
            </PagePanel>
        </>
    );
}

EditNewsletter.layout = {
    breadcrumbs: [
        { title: 'Newsletters', href: newslettersIndex().url },
        { title: 'Edit', href: '#' },
    ],
};
