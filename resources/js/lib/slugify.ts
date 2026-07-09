/**
 * Mirrors `Str::slug()` closely enough to preview the URL the server will
 * generate. The server remains the source of truth and de-duplicates.
 */
export function slugify(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
