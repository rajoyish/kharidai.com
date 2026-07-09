import Markdown from 'markdown-to-jsx/react';

import { normalizeProductDescriptionMarkdown } from '@/lib/product-description-markdown';
import { productDescriptionMarkdownOptions } from '@/lib/product-description-markdown-options';
import { cn } from '@/lib/utils';

type CmsContentProps = {
    content?: string | null;
    className?: string;
};

/**
 * Renders CMS body content authored in the Novel editor.
 *
 * The editor emits HTML, which is normalized back to markdown before it is
 * rendered, matching how product descriptions are handled.
 */
export function CmsContent({ content, className }: CmsContentProps) {
    if (!content) {
        return null;
    }

    return (
        <div
            className={cn(
                'prose max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:break-words prose-a:text-primary prose-a:transition-colors prose-a:hover:text-accent prose-code:before:content-none prose-code:after:content-none prose-img:rounded-xl prose-img:border prose-img:border-border',
                className,
            )}
        >
            <Markdown options={productDescriptionMarkdownOptions}>
                {normalizeProductDescriptionMarkdown(content)}
            </Markdown>
        </div>
    );
}
