import {
    index as pagesIndex,
    store,
} from '@/actions/App/Http/Controllers/Admin/PageController';
import { CmsForm } from '@/components/CmsForm';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';

export default function CreatePage() {
    return (
        <>
            <SeoHead title="Create Page" />

            <PagePanel variant="transparent">
                <CmsForm
                    submitUrl={store.url()}
                    resourceLabel="Page"
                    cancelUrl={pagesIndex.url()}
                />
            </PagePanel>
        </>
    );
}

CreatePage.layout = {
    breadcrumbs: [
        { title: 'Pages', href: '/admin/pages' },
        { title: 'Create', href: '/admin/pages/create' },
    ],
};
