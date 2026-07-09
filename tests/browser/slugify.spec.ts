import { expect, test } from '@playwright/test';

import { slugify } from '../../resources/js/lib/slugify';

test.describe('slugify', () => {
    test('lowercases and hyphenates a title', () => {
        expect(slugify('Privacy Policy')).toBe('privacy-policy');
    });

    test('collapses punctuation and repeated separators', () => {
        expect(slugify('Terms & Conditions -- 2026!')).toBe(
            'terms-conditions-2026',
        );
    });

    test('strips accents rather than dropping the letter', () => {
        expect(slugify('Café Münchén')).toBe('cafe-munchen');
    });

    test('trims separators left by leading and trailing noise', () => {
        expect(slugify('  ...Hello World...  ')).toBe('hello-world');
    });

    test('returns an empty string when nothing survives', () => {
        expect(slugify('!!!')).toBe('');
        expect(slugify('')).toBe('');
    });
});
