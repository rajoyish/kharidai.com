import {
    index as postsIndex,
    update,
} from '@/actions/App/Http/Controllers/Admin/PostController';
import { CmsForm } from '@/components/CmsForm';
import type { CmsRecord } from '@/components/CmsForm';
import { PagePanel } from '@/components/page-panel';
import { SeoHead } from '@/components/seo-head';

export default function EditPost({ post }: { post: CmsRecord }) {
    return (
        <>
            <SeoHead title={`Edit ${post.title}`} />

            <PagePanel variant="transparent">
                <CmsForm
                    submitUrl={update.url(post.slug)}
                    resourceLabel="Post"
                    cancelUrl={postsIndex.url()}
                    record={post}
                    withExcerpt
                />
            </PagePanel>
        </>
    );
}

EditPost.layout = {
    breadcrumbs: [
        { title: 'Blog Posts', href: '/admin/posts' },
        { title: 'Edit', href: '#' },
    ],
};
