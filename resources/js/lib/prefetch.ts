/**
 * When a `<Link>` starts fetching the page it points at.
 *
 * Inertia's bare `prefetch` means hover only, and hover does not exist on a
 * touchscreen, so on phones it buys nothing at all. Adding `click` starts the
 * request on pointerdown instead, which reclaims the gap between a finger
 * landing and the click event firing. That gap is small, but it is the only
 * prefetch a mobile visitor can get.
 */
export const LINK_PREFETCH: ('hover' | 'click')[] = ['hover', 'click'];
