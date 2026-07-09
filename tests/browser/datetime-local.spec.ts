import { expect, test } from '@playwright/test';

import {
    dateTimeLocalToIso,
    isoToDateTimeLocal,
} from '../../resources/js/lib/datetime-local';

test.describe('datetime-local conversion', () => {
    test('converts a local wall-clock value to a UTC instant', () => {
        const iso = dateTimeLocalToIso('2026-07-09T18:15');

        // The offset depends on the runner's timezone, so compare instants.
        expect(iso).toBe(new Date('2026-07-09T18:15').toISOString());
        expect(iso.endsWith('Z')).toBe(true);
    });

    test('round-trips an instant back to the same wall-clock value', () => {
        const original = '2026-07-09T18:15';

        expect(isoToDateTimeLocal(dateTimeLocalToIso(original))).toBe(original);
    });

    test('renders an offset-bearing instant in the viewer timezone', () => {
        const instant = '2026-07-09T12:30:00.000Z';
        const expected = new Date(instant);
        const pad = (n: number) => String(n).padStart(2, '0');

        expect(isoToDateTimeLocal(instant)).toBe(
            `${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}` +
                `T${pad(expected.getHours())}:${pad(expected.getMinutes())}`,
        );
    });

    test('treats blank and invalid values as empty', () => {
        expect(dateTimeLocalToIso('')).toBe('');
        expect(dateTimeLocalToIso(null)).toBe('');
        expect(dateTimeLocalToIso('not-a-date')).toBe('');
        expect(isoToDateTimeLocal('')).toBe('');
        expect(isoToDateTimeLocal(undefined)).toBe('');
        expect(isoToDateTimeLocal('not-a-date')).toBe('');
    });
});
