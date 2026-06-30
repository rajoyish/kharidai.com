import { expect, test } from '@playwright/test';
import Markdown from 'markdown-to-jsx/react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { normalizeProductDescriptionMarkdown } from '../../resources/js/lib/product-description-markdown';

const markdownOptions = {
    forceBlock: true,
    overrides: {
        input: {
            props: {
                readOnly: true,
            },
        },
    },
};
const renderDescriptionMarkdown = (description: string) =>
    renderToStaticMarkup(
        React.createElement(
            Markdown,
            { options: markdownOptions },
            normalizeProductDescriptionMarkdown(description),
        ),
    );

test.describe('product description markdown', () => {
    test('renders markdown syntax on the storefront', () => {
        const html = renderDescriptionMarkdown(
            '# Details\n\nThis is **bold** and [linked](https://example.com).',
        );

        expect(html).toContain('<h1 id="details">Details</h1>');
        expect(html).toContain('<strong>bold</strong>');
        expect(html).toContain('<a href="https://example.com">linked</a>');
    });

    test('renders stored editor HTML without escaping product content', () => {
        const html = renderDescriptionMarkdown(
            '<p><strong>Bold</strong> text</p><ul><li><p>First item</p></li></ul>',
        );

        expect(html).toContain('<p><strong>Bold</strong> text</p>');
        expect(html).toContain('<ul><li><p>First item</p></li></ul>');
    });

    test('normalizes editor paragraphs containing markdown block syntax', () => {
        const html = renderDescriptionMarkdown(
            [
                '<h1>Heading 1</h1>',
                '<p>## Heading Level 2</p>',
                '<p>### Heading Level 3</p>',
                '<p>&gt; This is a blockquote element.</p>',
                '<p>#### Lists</p>',
                '<p>* First item</p>',
                '<p>* Second item</p>',
                '<p>1. First step</p>',
                '<p>2. Second step</p>',
                '<p>```javascript</p>',
                '<p>function greetUser(name) {</p>',
                '<p>console.log<code>Hello, ${name}!</code>);</p>',
                '<p>}</p>',
                '<p>```</p>',
                '<p>You can create an [External Link](<a href="https://www.example.com">https://www.example.com</a>).</p>',
                '<p>![Alt Text Placeholder](<a href="https://placeholder.com">https://placeholder.com</a>)</p>',
                '<p>| Item Name | Quantity | Price |</p>',
                '<p>| :--- | :---: | ---: |</p>',
                '<p>| Widget A | 10 | $5.00 |</p>',
            ].join(''),
        );

        expect(html).toContain('<h2 id="heading-level-2">Heading Level 2</h2>');
        expect(html).toContain('<h3 id="heading-level-3">Heading Level 3</h3>');
        expect(html).toContain('<blockquote>');
        expect(html).toContain(
            '<ul><li>First item</li><li>Second item</li></ul>',
        );
        expect(html).toContain(
            '<ol start="1"><li>First step</li><li>Second step</li></ol>',
        );
        expect(html).toContain(
            '<pre><code class="language-javascript lang-javascript">',
        );
        expect(html).toContain('Hello, ${name}!');
        expect(html).toContain(
            '<a href="https://www.example.com">External Link</a>',
        );
        expect(html).toContain(
            '<img alt="Alt Text Placeholder" src="https://placeholder.com"/>',
        );
        expect(html).toContain('<table>');
        expect(html).toContain('<td style="text-align:right">$5.00</td>');
    });

    test('escapes dangerous raw HTML by default', () => {
        const html = renderDescriptionMarkdown('<script>alert("xss")</script>');

        expect(html).toContain('&lt;script&gt;');
        expect(html).not.toContain('<script>');
    });
});
