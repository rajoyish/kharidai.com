import {
    create as createNewsletter,
    index as newslettersIndex,
    store,
} from '@/actions/App/Http/Controllers/Admin/NewsletterController';
import type { EmailQuotaSummary } from '@/components/email-quota-stats';
import {
    NewsletterComposer
    
} from '@/components/newsletter-composer';
import type {NewsletterRecipientOption} from '@/components/newsletter-composer';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';

export default function CreateNewsletter({
    selectedUsers,
    audienceCount,
    emailStats,
}: {
    selectedUsers: NewsletterRecipientOption[];
    audienceCount: number;
    emailStats: EmailQuotaSummary;
}) {
    return (
        <>
            <SeoHead title="Compose Newsletter" />

            <PagePanel
                title="Compose newsletter"
                description="Mass email to registered users, paced by the daily free-tier send limits."
                variant="transparent"
            >
                <NewsletterComposer
                    submitUrl={store.url()}
                    cancelUrl={newslettersIndex.url()}
                    selectedUsers={selectedUsers}
                    audienceCount={audienceCount}
                    emailStats={emailStats}
                />
            </PagePanel>
        </>
    );
}

CreateNewsletter.layout = {
    breadcrumbs: [
        { title: 'Newsletters', href: newslettersIndex().url },
        { title: 'Compose', href: createNewsletter().url },
    ],
};
