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
    test('opens the media gallery in a dialog with a width-fitting grid', () => {
        expect(mediaManagerSource).toContain('@/components/ui/dialog');
        expect(mediaManagerSource).toContain('<Dialog onOpenChange=');
        expect(mediaManagerSource).toContain('<DialogTrigger asChild>');
        expect(mediaManagerSource).toContain(
            'grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]',
        );
        expect(mediaManagerSource).toContain('AttachmentGroup');
        expect(mediaManagerSource).toContain('overflow-y-auto');
        expect(mediaManagerSource).toContain('w-full! min-w-0');
        expect(mediaManagerSource).toContain('size="icon"');
        expect(mediaManagerSource).toContain('Copy Markdown');
        expect(mediaManagerSource).toContain('Delete');
    });

    test('keeps generated attachment actions compatible with local button sizes', () => {
        expect(attachmentSource).toContain('size = "icon"');
        expect(attachmentSource).not.toContain('size = "icon-xs"');
    });
});
