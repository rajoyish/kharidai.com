import { expect, test } from '@playwright/test';

import {
    messengerHref,
    shouldShowScrollUp,
    whatsappHref,
} from '../../resources/js/components/floating-contact-actions';

test.describe('floating contact actions', () => {
    test('uses the expected support links', () => {
        expect(whatsappHref).toBe('https://wa.me/9779740820005');
        expect(messengerHref).toBe('https://m.me/kharidai');
    });

    test('switches to scroll-up after half a viewport', () => {
        expect(shouldShowScrollUp(0, 1000)).toBe(false);
        expect(shouldShowScrollUp(499, 1000)).toBe(false);
        expect(shouldShowScrollUp(501, 1000)).toBe(true);
    });
});
