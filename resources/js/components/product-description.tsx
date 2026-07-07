import Markdown from 'markdown-to-jsx/react';

import { normalizeProductDescriptionMarkdown } from '@/lib/product-description-markdown';
import { productDescriptionMarkdownOptions } from '@/lib/product-description-markdown-options';

export { productDescriptionMarkdownOptions };

type ProductDescriptionProps = {
    description?: string | null;
};

export function ProductDescription({ description }: ProductDescriptionProps) {
    if (!description) {
        return null;
    }

    const normalizedDescription =
        normalizeProductDescriptionMarkdown(description);

    return (
        <div className="prose mb-8 max-w-none text-muted-foreground dark:prose-invert prose-a:break-words prose-code:before:content-none prose-code:after:content-none prose-img:rounded-lg prose-img:border prose-img:border-border">
            <Markdown options={productDescriptionMarkdownOptions}>
                {normalizedDescription}
            </Markdown>
        </div>
    );
}
