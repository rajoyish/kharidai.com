/** Matches an image in a guide body, whether it survived as HTML or markdown. */
const GUIDE_IMAGE_PATTERN =
    /<img[^>]+src=["']([^"']+)["']|!\[[^\]]*\]\(\s*([^)\s]+)/g;

/**
 * Every image in a guide body, in the order it is read.
 *
 * Collected up front so the lightbox opens as a gallery: the reader lands on the
 * screenshot they clicked and can arrow through the rest of the steps without
 * closing it. Duplicates collapse, so an image repeated across two steps is one
 * slide rather than two identical ones.
 *
 * The Novel editor stores HTML, which the renderer normalizes back to markdown,
 * so a body can hold either form — sometimes both. Both are matched here rather
 * than assuming which survived.
 *
 * Kept free of JSX so the Playwright static suite can import it directly.
 */
export function collectGuideImages(content: string | null): string[] {
    if (!content) {
        return [];
    }

    const sources = new Set<string>();

    for (const match of content.matchAll(GUIDE_IMAGE_PATTERN)) {
        const src = match[1] ?? match[2];

        if (src) {
            sources.add(src);
        }
    }

    return [...sources];
}
