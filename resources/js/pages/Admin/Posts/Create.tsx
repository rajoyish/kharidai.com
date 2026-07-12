import {
    create as createPost,
    index as postsIndex,
    store,
} from '@/actions/App/Http/Controllers/Admin/PostController';
import { CmsForm } from '@/components/CmsForm';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';

export default function CreatePost() {
    return (
        <>
            <SeoHead title="Create Post" />

            <PagePanel variant="transparent">
                <CmsForm
                    submitUrl={store.url()}
                    resourceLabel="Post"
                    cancelUrl={postsIndex.url()}
                    withExcerpt
                />
            </PagePanel>
        </>
    );
}

CreatePost.layout = {
    breadcrumbs: [
        { title: 'Blog Posts', href: postsIndex().url },
        { title: 'Create', href: createPost().url },
    ],
};
