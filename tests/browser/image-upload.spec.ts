import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

import {
    IMAGE_UPLOAD_MAX_BYTES,
    formatFileSize,
    imageRejectionReason,
} from '../../resources/js/lib/image-upload';

const HERO = { width: 1200, height: 630 };
const TWO_MEGABYTES = 2048 * 1024;

const imageUploadSource = readFileSync(
    resolve(process.cwd(), 'resources/js/components/image-upload.tsx'),
    'utf8',
);
const productFormSource = readFileSync(
    resolve(process.cwd(), 'resources/js/components/ProductForm.tsx'),
    'utf8',
);
const cmsFormSource = readFileSync(
    resolve(process.cwd(), 'resources/js/components/CmsForm.tsx'),
    'utf8',
);

test.describe('image upload rules', () => {
    test('accepts an image that satisfies every constraint', () => {
        expect(
            imageRejectionReason(
                { type: 'image/png', size: 500_000, dimensions: HERO },
                { maxSizeBytes: TWO_MEGABYTES, requiredDimensions: HERO },
            ),
        ).toBeNull();
    });

    test('rejects a file that is not an image', () => {
        expect(
            imageRejectionReason({ type: 'application/pdf', size: 1000 }),
        ).toBe('Only image files can be uploaded.');
    });

    test('rejects an image above the size limit', () => {
        expect(
            imageRejectionReason(
                { type: 'image/jpeg', size: TWO_MEGABYTES + 1 },
                { maxSizeBytes: TWO_MEGABYTES },
            ),
        ).toBe('Image must be under 2 MB.');
    });

    test('accepts an image exactly at the size limit', () => {
        expect(
            imageRejectionReason(
                { type: 'image/jpeg', size: TWO_MEGABYTES },
                { maxSizeBytes: TWO_MEGABYTES },
            ),
        ).toBeNull();
    });

    test('rejects a hero image of the wrong dimensions', () => {
        expect(
            imageRejectionReason(
                {
                    type: 'image/png',
                    size: 1000,
                    dimensions: { width: 800, height: 600 },
                },
                { requiredDimensions: HERO },
            ),
        ).toBe(
            'Image must be exactly 1200x630px. Selected image is 800x600px.',
        );
    });

    test('ignores dimensions when no exact size is required', () => {
        expect(
            imageRejectionReason({
                type: 'image/webp',
                size: 1000,
                dimensions: { width: 3, height: 4 },
            }),
        ).toBeNull();
    });

    test('caps uploads at 1 MB by default', () => {
        expect(IMAGE_UPLOAD_MAX_BYTES).toBe(1024 * 1024);

        expect(
            imageRejectionReason(
                { type: 'image/png', size: IMAGE_UPLOAD_MAX_BYTES + 1 },
                { maxSizeBytes: IMAGE_UPLOAD_MAX_BYTES },
            ),
        ).toBe('Image must be under 1 MB.');

        expect(
            imageRejectionReason(
                { type: 'image/png', size: IMAGE_UPLOAD_MAX_BYTES },
                { maxSizeBytes: IMAGE_UPLOAD_MAX_BYTES },
            ),
        ).toBeNull();
    });

    test('the component applies the 1 MB cap unless a caller overrides it', () => {
        expect(imageUploadSource).toContain(
            'maxSizeBytes = IMAGE_UPLOAD_MAX_BYTES',
        );
        expect(productFormSource).not.toContain('maxSizeBytes');
        expect(cmsFormSource).not.toContain('maxSizeBytes');
    });

    test('formats size limits for humans', () => {
        expect(formatFileSize(TWO_MEGABYTES)).toBe('2 MB');
        expect(formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(formatFileSize(1_572_864)).toBe('1.5 MB');
        expect(formatFileSize(512 * 1024)).toBe('512 KB');
    });
});

test.describe('image upload component', () => {
    test('handles drag-and-drop as well as click-to-browse', () => {
        expect(imageUploadSource).toContain('onDragEnter={handleDragEnter}');
        expect(imageUploadSource).toContain('onDragOver={handleDragOver}');
        expect(imageUploadSource).toContain('onDragLeave={handleDragLeave}');
        expect(imageUploadSource).toContain('onDrop={handleDrop}');
        expect(imageUploadSource).toContain('event.dataTransfer.files?.[0]');
        expect(imageUploadSource).toContain('openFilePicker');
    });

    test('previews the pending file and releases its object URL', () => {
        expect(imageUploadSource).toContain('URL.createObjectURL(file)');
        expect(imageUploadSource).toContain('URL.revokeObjectURL');
        expect(imageUploadSource).toContain(
            'const previewUrl = (value && pendingPreviewUrl) || initialPreviewUrl;',
        );
    });
});

test.describe('form integration', () => {
    test('the product form renders its main image through the shared component', () => {
        expect(productFormSource).toContain(
            "import { ImageUpload } from './image-upload'",
        );
        expect(productFormSource).toContain('<ImageUpload');
        expect(productFormSource).toContain("setData('image', file)");
        // The stored path is relative, so the form resolves it to a URL itself.
        expect(productFormSource).toContain('`/storage/${product.image}`');
        expect(productFormSource).not.toContain('Current product image');
    });

    test('the cms form keeps enforcing the exact hero dimensions', () => {
        expect(cmsFormSource).toContain('<ImageUpload');
        expect(cmsFormSource).toContain('requiredDimensions={{');
        expect(cmsFormSource).toContain('width: HERO_IMAGE_WIDTH');
        expect(cmsFormSource).toContain('height: HERO_IMAGE_HEIGHT');
        expect(cmsFormSource).toContain(
            'initialPreviewUrl={record?.image ?? null}',
        );
    });
});
