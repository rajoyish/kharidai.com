import {
    index as pagesIndex,
    update,
} from '@/actions/App/Http/Controllers/Admin/PageController';
import { CmsForm } from '@/components/CmsForm';
import type { CmsRecord } from '@/components/CmsForm';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';

export default function EditPage({ page }: { page: CmsRecord }) {
    return (
        <>
            <SeoHead title={`Edit ${page.title}`} />

            <PagePanel variant="transparent">
                <CmsForm
                    submitUrl={update.url(page.slug)}
                    resourceLabel="Page"
                    cancelUrl={pagesIndex.url()}
                    record={page}
                />
            </PagePanel>
        </>
    );
}

EditPage.layout = {
    breadcrumbs: [
        { title: 'Pages', href: pagesIndex().url },
        { title: 'Edit', href: '#' },
    ],
};
