type MarkdownSegmentKind =
    | 'blockquote'
    | 'block'
    | 'fenceContent'
    | 'fenceEnd'
    | 'fenceStart'
    | 'list'
    | 'table';

const htmlEntities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
};

export function normalizeProductDescriptionMarkdown(
    description: string,
): string {
    const trimmedDescription = unwrapMarkdownCodeBlocks(description.trim());

    if (!/<p\b/i.test(trimmedDescription)) {
        return trimmedDescription;
    }

    const paragraphRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    const segments: string[] = [];
    let cursor = 0;
    let paragraphMatch: RegExpExecArray | null;

    while ((paragraphMatch = paragraphRegex.exec(trimmedDescription))) {
        const rawBeforeParagraph = trimmedDescription
            .slice(cursor, paragraphMatch.index)
            .trim();

        if (rawBeforeParagraph) {
            segments.push(rawBeforeParagraph);
        }

        const paragraphContent = normalizeInlineHtml(paragraphMatch[1]).trim();

        if (paragraphContent) {
            segments.push(paragraphContent);
        }

        cursor = paragraphMatch.index + paragraphMatch[0].length;
    }

    const rawAfterParagraphs = trimmedDescription.slice(cursor).trim();

    if (rawAfterParagraphs) {
        segments.push(rawAfterParagraphs);
    }

    return joinMarkdownSegments(segments);
}

const markdownCodeBlockRegex =
    /<pre\b[^>]*>\s*<code\b[^>]*class="[^"]*\blanguage-markdown\b[^"]*"[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;

/**
 * Rich-text editors persist markdown authored inside a fenced code block as a
 * `<pre><code class="language-markdown">` element, which would otherwise render
 * as literal code. Unwrap those blocks so their contents (tables, etc.) render
 * as real markdown.
 */
function unwrapMarkdownCodeBlocks(html: string): string {
    return html.replace(markdownCodeBlockRegex, (_, content: string) =>
        decodeHtmlEntities(stripHtmlTags(content)).trim(),
    );
}

function joinMarkdownSegments(segments: string[]): string {
    let markdown = '';
    let previousKind: MarkdownSegmentKind | null = null;
    let isInsideFence = false;

    for (const segment of segments) {
        const kind = classifySegment(segment, isInsideFence);

        if (markdown) {
            markdown += shouldUseSingleNewline(
                previousKind,
                kind,
                isInsideFence,
            )
                ? '\n'
                : '\n\n';
        }

        markdown += segment;

        if (kind === 'fenceStart') {
            isInsideFence = true;
        }

        if (kind === 'fenceEnd') {
            isInsideFence = false;
        }

        previousKind = kind;
    }

    return markdown;
}

function classifySegment(
    segment: string,
    isInsideFence: boolean,
): MarkdownSegmentKind {
    if (isInsideFence) {
        return /^```/.test(segment) ? 'fenceEnd' : 'fenceContent';
    }

    if (/^```/.test(segment)) {
        return 'fenceStart';
    }

    if (/^\s{0,3}(?:[-*+]\s+|\d+[.)]\s+)/.test(segment)) {
        return 'list';
    }

    if (/^\s{0,3}\|.*\|\s*$/.test(segment)) {
        return 'table';
    }

    if (/^\s{0,3}>\s?/.test(segment)) {
        return 'blockquote';
    }

    return 'block';
}

function shouldUseSingleNewline(
    previousKind: MarkdownSegmentKind | null,
    currentKind: MarkdownSegmentKind,
    isInsideFence: boolean,
): boolean {
    if (!previousKind || isInsideFence) {
        return isInsideFence;
    }

    return (
        (previousKind === 'list' && currentKind === 'list') ||
        (previousKind === 'table' && currentKind === 'table') ||
        (previousKind === 'blockquote' && currentKind === 'blockquote')
    );
}

function normalizeInlineHtml(html: string): string {
    return decodeHtmlEntities(
        html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, content) =>
                wrapInlineCode(stripHtmlTags(content)),
            )
            .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, text) => {
                const href = extractHtmlAttribute(attrs, 'href');
                const linkText = normalizeText(stripHtmlTags(text));

                if (href && normalizeText(href) === linkText) {
                    return href;
                }

                return match;
            }),
    );
}

function wrapInlineCode(content: string): string {
    const decodedContent = decodeHtmlEntities(content);
    const longestBacktickRun = Math.max(
        0,
        ...Array.from(
            decodedContent.matchAll(/`+/g),
            (match) => match[0].length,
        ),
    );
    const delimiter = '`'.repeat(longestBacktickRun + 1);

    return `${delimiter}${decodedContent}${delimiter}`;
}

function extractHtmlAttribute(html: string, attribute: string): string | null {
    const attributeRegex = new RegExp(
        `${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
        'i',
    );
    const attributeMatch = html.match(attributeRegex);

    if (!attributeMatch) {
        return null;
    }

    return decodeHtmlEntities(
        attributeMatch[1] ?? attributeMatch[2] ?? attributeMatch[3] ?? '',
    );
}

function stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

function normalizeText(value: string): string {
    return decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string): string {
    return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
        if (code.startsWith('#x')) {
            return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
        }

        if (code.startsWith('#')) {
            return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
        }

        return htmlEntities[code.toLowerCase()] ?? entity;
    });
}
