import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const mediaManagerSource = readFileSync(
    resolve(process.cwd(), 'resources/js/components/ui/media-manager.tsx'),
    'utf8',
);
const attachmentSource = readFileSync(
    resolve(process.cwd(), 'resources/js/components/ui/attachment.tsx'),
    'utf8',
);

test.describe('media manager gallery', () => {
    test('uses compact attachment thumbnails in a scrollable responsive gallery', () => {
        expect(mediaManagerSource).toContain('AttachmentGroup');
        expect(mediaManagerSource).toContain('max-h-72');
        expect(mediaManagerSource).toContain('overflow-y-auto');
        expect(mediaManagerSource).toContain('flex-wrap');
        expect(mediaManagerSource).toContain('w-[92px] sm:w-[104px]');
        expect(mediaManagerSource).toContain('size="icon"');
        expect(mediaManagerSource).toContain('Copy Markdown');
        expect(mediaManagerSource).toContain('Delete');
    });

    test('keeps generated attachment actions compatible with local button sizes', () => {
        expect(attachmentSource).toContain('size = "icon"');
        expect(attachmentSource).not.toContain('size = "icon-xs"');
    });
});
