/**
 * The zone the shop's times are shown in. Times are stored in UTC.
 *
 * Fixed rather than left to the runtime: the SSR server and the browser can
 * sit in different zones, and a time each renders differently is a hydration
 * mismatch that throws away the server render.
 */
export const SHOP_TIME_ZONE = 'Asia/Kathmandu';
