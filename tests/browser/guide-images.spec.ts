import { expect, test } from '@playwright/test';

import { collectGuideImages } from '../../resources/js/lib/guide-images';

test.describe('guide image collection', () => {
    test('collects images from the HTML the editor stores', () => {
        const content =
            '<p>Step one</p><img src="/guide-media/1" alt="Sign in">' +
            '<p>Step two</p><img alt="Confirm" src="/guide-media/2">';

        expect(collectGuideImages(content)).toEqual([
            '/guide-media/1',
            '/guide-media/2',
        ]);
    });

    test('collects images the renderer normalized back to markdown', () => {
        const content =
            '![Sign in](/guide-media/1)\n\n![Confirm](/guide-media/2)';

        expect(collectGuideImages(content)).toEqual([
            '/guide-media/1',
            '/guide-media/2',
        ]);
    });

    test('keeps reading order across both forms and collapses repeats', () => {
        const content =
            '<img src="/guide-media/3">![again](/guide-media/3)<img src="/guide-media/4">';

        expect(collectGuideImages(content)).toEqual([
            '/guide-media/3',
            '/guide-media/4',
        ]);
    });

    test('finds nothing in a guide with no images', () => {
        expect(collectGuideImages('<p>Just words.</p>')).toEqual([]);
        expect(collectGuideImages(null)).toEqual([]);
        expect(collectGuideImages('')).toEqual([]);
    });
});
