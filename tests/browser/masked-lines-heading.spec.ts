import { expect, test } from '@playwright/test';

import {
    maskedLinesRevealVars,
    maskedLinesSplitVars,
} from '../../resources/js/components/masked-lines-heading';

test.describe('masked lines heading', () => {
    test('splits into per-line masks that re-split responsively', () => {
        expect(maskedLinesSplitVars.type).toBe('lines');
        expect(maskedLinesSplitVars.mask).toBe('lines');
        expect(maskedLinesSplitVars.autoSplit).toBe(true);
    });

    test('reveals each line from fully below its mask, one at a time', () => {
        // Above 100 so the line starts completely hidden beneath the clip.
        expect(maskedLinesRevealVars.yPercent).toBeGreaterThan(100);
        expect(maskedLinesRevealVars.opacity).toBe(0);
        // A positive stagger is what makes the lines cascade in sequence.
        expect(maskedLinesRevealVars.stagger).toBeGreaterThan(0);
        expect(maskedLinesRevealVars.duration).toBeGreaterThan(0);
    });
});
