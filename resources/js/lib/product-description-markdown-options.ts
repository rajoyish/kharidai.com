import type { MarkdownToJSX } from 'markdown-to-jsx/react';
import { createElement } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * Wide markdown tables overflow the description column on narrow viewports.
 * Wrapping the table lets it scroll horizontally without breaking the layout.
 *
 * Written with `createElement` (instead of JSX) so this module stays free of
 * JSX and can be imported directly by the Playwright browser tests.
 */
function ScrollableTable({
    children,
    ...props
}: ComponentPropsWithoutRef<'table'>) {
    return createElement(
        'div',
        { className: 'overflow-x-auto' },
        createElement('table', props, children),
    );
}

export const productDescriptionMarkdownOptions = {
    forceBlock: true,
    overrides: {
        input: {
            props: {
                readOnly: true,
            },
        },
        table: {
            component: ScrollableTable,
        },
    },
} satisfies MarkdownToJSX.Options;
