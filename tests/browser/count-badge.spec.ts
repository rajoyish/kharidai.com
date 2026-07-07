import { expect, test } from '@playwright/test';

import { formatCount } from '../../resources/js/components/count-badge';

test.describe('count badge formatting', () => {
    test('renders one-, two- and three-digit counts verbatim', () => {
        expect(formatCount(3)).toBe('3');
        expect(formatCount(12)).toBe('12');
        expect(formatCount(123)).toBe('123');
    });

    test('collapses counts above the cap to `${max}+`', () => {
        expect(formatCount(1000)).toBe('999+');
        expect(formatCount(999)).toBe('999');
        expect(formatCount(50, 20)).toBe('20+');
    });

    test('normalizes negatives and decimals to a clean integer string', () => {
        expect(formatCount(-5)).toBe('0');
        expect(formatCount(4.9)).toBe('4');
    });
});
