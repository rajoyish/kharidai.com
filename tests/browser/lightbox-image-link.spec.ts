import { expect, test } from '@playwright/test';

import {
    LightboxImageAnchor,
    shouldOpenLightboxFromClick,
} from '../../resources/js/components/lightbox-image-link';

test.describe('lightbox image link', () => {
    test('renders an accessible anchor fallback for full-size images', () => {
        const anchor = LightboxImageAnchor({
            alt: 'Product preview',
            ariaLabel: 'View full-size product image',
            className: 'preview-link',
            imageClassName: 'preview-image',
            onClick: () => undefined,
            src: '/storage/products/example.jpg',
        });

        expect(anchor.type).toBe('a');
        expect(anchor.props.href).toBe('/storage/products/example.jpg');
        expect(anchor.props.target).toBe('_blank');
        expect(anchor.props.rel).toBe('noopener noreferrer');
        expect(anchor.props['aria-label']).toBe(
            'View full-size product image',
        );
        expect(anchor.props.className).toContain('preview-link');

        const previewImage = anchor.props.children;

        expect(previewImage.type).toBe('img');
        expect(previewImage.props.alt).toBe('Product preview');
        expect(previewImage.props.className).toBe('preview-image');
    });

    test('keeps native link behavior for modified clicks', () => {
        expect(
            shouldOpenLightboxFromClick({
                altKey: false,
                button: 0,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
            }),
        ).toBe(true);

        expect(
            shouldOpenLightboxFromClick({
                altKey: false,
                button: 0,
                ctrlKey: true,
                metaKey: false,
                shiftKey: false,
            }),
        ).toBe(false);

        expect(
            shouldOpenLightboxFromClick({
                altKey: false,
                button: 1,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
            }),
        ).toBe(false);
    });
});
