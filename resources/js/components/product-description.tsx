import Markdown from 'markdown-to-jsx/react';
import type { MarkdownToJSX } from 'markdown-to-jsx/react';

import { normalizeProductDescriptionMarkdown } from '@/lib/product-description-markdown';

export const productDescriptionMarkdownOptions = {
    forceBlock: true,
    overrides: {
        input: {
            props: {
                readOnly: true,
            },
        },
    },
} satisfies MarkdownToJSX.Options;

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
        <div className="prose mb-8 max-w-none text-muted-foreground dark:prose-invert">
            <Markdown options={productDescriptionMarkdownOptions}>
                {normalizedDescription}
            </Markdown>
        </div>
    );
}
