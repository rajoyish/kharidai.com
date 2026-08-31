import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    ChevronDown,
    Cpu,
    LayoutGrid,
    Menu,
    Package,
    ShoppingCart,
    Sparkles,
    User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import AppLogo from '@/components/app-logo';
import AppearanceTabs from '@/components/appearance-tabs';
import { AppearanceToggle } from '@/components/appearance-toggle';
import { LoginDialog } from '@/components/login-dialog';
import { NavScroller } from '@/components/nav-scroller';
import { StorefrontNavLink } from '@/components/storefront-nav-link';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { LINK_PREFETCH } from '@/lib/prefetch';
import { home } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as blogIndex } from '@/routes/blog';
import { index as cartIndex } from '@/routes/cart';
import { show as showCategory } from '@/routes/categories';
import { index as digitalProducts } from '@/routes/digital-products';
import { index as ordersIndex } from '@/routes/orders';
import { show as showPage } from '@/routes/pages';
import { index as physicalProducts } from '@/routes/physical-products';
import { index as services } from '@/routes/services';
import type { SharedData } from '@/types';
import type {
    MenuNode,
    StorefrontNavigationGroup,
    StorefrontNavigationGroupType,
} from '@/types/storefront';

const GROUP_META: Record<
    StorefrontNavigationGroupType,
    { icon: ComponentType<{ className?: string }>; description: string }
> = {
    digital: { icon: Cpu, description: 'Software, subscriptions & downloads' },
    physical: {
        icon: Package,
        description: 'Real products, shipped to your door',
    },
    service: { icon: Sparkles, description: 'Work with our expert team' },
    more: { icon: LayoutGrid, description: 'Browse everything else' },
};

/**
 * Landing page for each product type. The catch-all "more" group has no
 * dedicated page, so its entries only ever link to their categories.
 */
const GROUP_HREF: Partial<
    Record<StorefrontNavigationGroupType, ReturnType<typeof digitalProducts>>
> = {
    digital: digitalProducts(),
    physical: physicalProducts(),
    service: services(),
};

/**
 * Every nav control carries a visible focus ring. Tabbing is the only way a
 * keyboard user can tell where they are, and the scroll track relies on it too:
 * focusing a link the browser has to scroll into view is what makes an
 * overflowing menu keyboard-reachable at all.
 */
const FOCUS_CLASSES =
    'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background';

const DESKTOP_LINK_CLASSES = `shrink-0 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:text-primary aria-[current=page]:text-primary ${FOCUS_CLASSES}`;

const DESKTOP_TRIGGER_CLASSES = `group flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary ${FOCUS_CLASSES}`;

const DESKTOP_ACCOUNT_CLASSES = `flex items-center gap-2 rounded-md text-sm font-semibold transition-colors hover:text-primary ${FOCUS_CLASSES}`;

const MOBILE_ACCOUNT_CLASSES = `flex items-center gap-3 rounded-lg px-2 py-2 text-base font-medium transition-colors hover:bg-primary/10 hover:text-primary ${FOCUS_CLASSES}`;

const MOBILE_LINK_CLASSES = `rounded-lg px-2 py-2 text-base font-semibold transition-colors hover:bg-primary/10 hover:text-primary aria-[current=page]:text-primary ${FOCUS_CLASSES}`;

/**
 * Links inside a dropdown are wrapped in a `DropdownMenuItem` so that Radix
 * registers the click as a selection and closes the panel — a bare anchor
 * navigates but leaves the menu hanging open over the new page.
 *
 * The wrapper's own padding is stripped, because the link it wraps carries it.
 */
const DROPDOWN_ITEM_CLASSES = 'p-0';

/**
 * Arrowing through an open dropdown moves Radix's *highlight*, not DOM focus, so
 * a `:focus` style shows nothing and the menu looks inert to a keyboard user
 * even though it is responding. `data-highlighted` is the state to paint.
 */
const DROPDOWN_LINK_CLASSES =
    'block truncate rounded-md px-3 py-2 text-sm font-semibold no-underline transition-colors outline-none hover:bg-primary/10 hover:text-primary data-highlighted:bg-primary/10 data-highlighted:text-primary';

export function StorefrontHeader({
    hideNavigation = false,
}: {
    hideNavigation?: boolean;
}) {
    const { props, url } = usePage<SharedData>();
    const { auth, cartCount, storefront } = props;
    const groups = storefront?.groups ?? [];
    const hasBlogPosts = storefront?.hasBlogPosts ?? false;

    // Marks the link for the page you are already on, which is how a screen
    // reader conveys "you are here" — the colour change alone says nothing.
    const currentPath = url.split('?')[0];
    const isCurrent = (href: string): boolean => {
        const path = href.split('?')[0];

        return path === '/'
            ? currentPath === '/'
            : currentPath === path || currentPath.startsWith(`${path}/`);
    };

    // The admin-built menu owns the custom links once one exists. Until then the
    // header falls back to listing the pages flagged "show in nav", so a site
    // that has never opened the menu builder keeps the navigation it had.
    const menu = storefront?.menu ?? [];
    const fallbackPages = storefront?.navPages ?? [];
    const customLinks: MenuNode[] =
        menu.length > 0
            ? menu
            : fallbackPages.map((page, index) => ({
                  id: -(index + 1),
                  label: page.title,
                  href: showPage(page.slug).url,
                  opensInNewTab: false,
                  children: [],
              }));

    // Signed in, the account control is a link to the visitor's own area.
    // Signed out it opens the login modal instead of navigating to /login, so
    // the page they were on stays put behind the dialog.
    const accountHref = auth.user?.is_admin ? adminDashboard() : ordersIndex();
    const accountLabel = auth.user?.name ?? 'Login';

    const [isOpen, setIsOpen] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    useEffect(() => {
        return router.on('navigate', () => setIsOpen(false));
    }, []);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center gap-4 px-4 md:gap-6 md:px-6">
                <Link
                    href={home()}
                    prefetch={LINK_PREFETCH}
                    className="flex shrink-0 items-center gap-2"
                >
                    <AppLogo className="h-8 w-auto md:h-10" />
                </Link>

                {/* Main navigation. Overflowing items stay reachable by swipe or
                    arrow instead of wrapping and breaking the header's height. */}
                {!hideNavigation ? (
                    <nav
                        aria-label="Main"
                        className="hidden min-w-0 flex-1 md:block"
                    >
                        <NavScroller>
                            <Link
                                href={home()}
                                prefetch={LINK_PREFETCH}
                                aria-current={
                                    isCurrent('/') ? 'page' : undefined
                                }
                                className={DESKTOP_LINK_CLASSES}
                            >
                                Home
                            </Link>

                            {groups.map((group) => (
                                <GroupDropdown key={group.type} group={group} />
                            ))}

                            {hasBlogPosts && (
                                <Link
                                    href={blogIndex()}
                                    prefetch={LINK_PREFETCH}
                                    aria-current={
                                        isCurrent(blogIndex().url)
                                            ? 'page'
                                            : undefined
                                    }
                                    className={DESKTOP_LINK_CLASSES}
                                >
                                    Blog
                                </Link>
                            )}

                            {customLinks.map((item) =>
                                item.children.length > 0 ? (
                                    <MenuDropdown key={item.id} item={item} />
                                ) : (
                                    <StorefrontNavLink
                                        key={item.id}
                                        link={item}
                                        aria-current={
                                            item.href && isCurrent(item.href)
                                                ? 'page'
                                                : undefined
                                        }
                                        className={DESKTOP_LINK_CLASSES}
                                    />
                                ),
                            )}
                        </NavScroller>
                    </nav>
                ) : (
                    <div className="hidden flex-1 md:block" />
                )}

                {/* User Actions (Right) Desktop */}
                <div className="hidden shrink-0 items-center gap-6 md:flex">
                    <AppearanceToggle />
                    {auth.user ? (
                        <Link
                            href={accountHref}
                            prefetch={LINK_PREFETCH}
                            className={DESKTOP_ACCOUNT_CLASSES}
                        >
                            <User className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="max-w-40 truncate">
                                {accountLabel}
                            </span>
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsLoginOpen(true)}
                            className={DESKTOP_ACCOUNT_CLASSES}
                        >
                            <User className="h-5 w-5 shrink-0" aria-hidden />
                            <span className="max-w-40 truncate">
                                {accountLabel}
                            </span>
                        </button>
                    )}
                    <Link
                        href={cartIndex()}
                        prefetch={LINK_PREFETCH}
                        className={`relative flex items-center gap-2 rounded-md text-sm font-semibold transition-colors hover:text-primary ${FOCUS_CLASSES}`}
                    >
                        <div className="relative">
                            <ShoppingCart className="h-5 w-5" aria-hidden />
                            {cartCount > 0 && (
                                <span
                                    aria-hidden
                                    className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-bold text-primary-foreground"
                                >
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span>Cart</span>
                        <CartCountLabel count={cartCount} />
                    </Link>
                </div>

                {/* Mobile Menu (Right) */}
                <div className="ml-auto md:hidden">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10"
                            >
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="right"
                            className="w-80 overflow-y-auto sm:w-96"
                        >
                            <SheetHeader>
                                <SheetTitle className="text-left">
                                    Menu
                                </SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 flex flex-col gap-6 px-4 pb-8">
                                {!hideNavigation && (
                                    <nav
                                        aria-label="Main"
                                        className="flex flex-col gap-6"
                                    >
                                        <Link
                                            href={home()}
                                            prefetch={LINK_PREFETCH}
                                            aria-current={
                                                isCurrent('/')
                                                    ? 'page'
                                                    : undefined
                                            }
                                            className={MOBILE_LINK_CLASSES}
                                        >
                                            Home
                                        </Link>
                                        {groups.map((group) => (
                                            <MobileNavigationGroup
                                                key={group.type}
                                                group={group}
                                            />
                                        ))}
                                        {hasBlogPosts && (
                                            <Link
                                                href={blogIndex()}
                                                prefetch={LINK_PREFETCH}
                                                aria-current={
                                                    isCurrent(blogIndex().url)
                                                        ? 'page'
                                                        : undefined
                                                }
                                                className={MOBILE_LINK_CLASSES}
                                            >
                                                Blog
                                            </Link>
                                        )}
                                        {customLinks.length > 0 && (
                                            <div className="flex flex-col gap-0.5 border-t pt-6">
                                                {customLinks.map((item) => (
                                                    <MobileMenuItem
                                                        key={item.id}
                                                        item={item}
                                                        isCurrent={isCurrent}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </nav>
                                )}
                                <div className="flex flex-col gap-1 border-t pt-6">
                                    {auth.user ? (
                                        <Link
                                            href={accountHref}
                                            prefetch={LINK_PREFETCH}
                                            className={MOBILE_ACCOUNT_CLASSES}
                                        >
                                            <User
                                                className="h-5 w-5 shrink-0"
                                                aria-hidden
                                            />
                                            <span className="truncate">
                                                {accountLabel}
                                            </span>
                                        </Link>
                                    ) : (
                                        <button
                                            type="button"
                                            // The drawer deliberately stays
                                            // open underneath. Closing it in
                                            // the same tick lets its focus
                                            // scope restore focus to the menu
                                            // button once its exit animation
                                            // ends — after the dialog has
                                            // already taken focus. Stacked,
                                            // Esc closes the dialog first and
                                            // focus returns here.
                                            onClick={() => setIsLoginOpen(true)}
                                            className={MOBILE_ACCOUNT_CLASSES}
                                        >
                                            <User
                                                className="h-5 w-5 shrink-0"
                                                aria-hidden
                                            />
                                            <span className="truncate">
                                                {accountLabel}
                                            </span>
                                        </button>
                                    )}
                                    <Link
                                        href={cartIndex()}
                                        prefetch={LINK_PREFETCH}
                                        className={`relative flex items-center gap-3 rounded-lg px-2 py-2 text-base font-medium transition-colors hover:bg-primary/10 hover:text-primary ${FOCUS_CLASSES}`}
                                    >
                                        <div className="relative">
                                            <ShoppingCart
                                                className="h-5 w-5"
                                                aria-hidden
                                            />
                                            {cartCount > 0 && (
                                                <span
                                                    aria-hidden
                                                    className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-bold text-primary-foreground"
                                                >
                                                    {cartCount}
                                                </span>
                                            )}
                                        </div>
                                        <span>Cart</span>
                                        <CartCountLabel count={cartCount} />
                                    </Link>
                                </div>

                                {/* The drawer gets the segmented control rather
                                    than the header's icon dropdown: a menu
                                    opening out of an already-open sheet is
                                    awkward on touch, and there is room here to
                                    label all three choices. */}
                                <div className="flex flex-col gap-3 border-t pt-6">
                                    <h4 className="px-2 text-sm font-bold tracking-wide">
                                        Theme
                                    </h4>
                                    <AppearanceTabs className="self-start" />
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
        </header>
    );
}

/**
 * The cart count, spoken rather than shown. The badge itself is a bare number
 * pinned to an icon, which a screen reader would otherwise read as a stray digit
 * next to the word "Cart".
 */
function CartCountLabel({ count }: { count: number }) {
    if (count === 0) {
        return null;
    }

    return (
        <span className="sr-only">
            {count === 1 ? '1 item in cart' : `${count} items in cart`}
        </span>
    );
}

/** A product-type group and its category tree, as a dropdown in the nav track. */
function GroupDropdown({ group }: { group: StorefrontNavigationGroup }) {
    const meta = GROUP_META[group.type] ?? GROUP_META.more;
    const Icon = meta.icon;
    const groupHref = GROUP_HREF[group.type];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={DESKTOP_TRIGGER_CLASSES}>
                <Icon className="h-4 w-4 text-muted-foreground" />
                {group.label}
                <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-[min(94vw,320px)] p-4"
            >
                <div className="mb-3 flex items-center gap-3 border-b pb-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm leading-tight font-semibold">
                            {group.label}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {meta.description}
                        </p>
                    </div>
                </div>

                {groupHref && (
                    <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASSES}>
                        <Link
                            href={groupHref}
                            prefetch={LINK_PREFETCH}
                            className="mb-1 flex items-center justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-semibold text-primary no-underline transition-colors outline-none hover:bg-primary/10 data-highlighted:bg-primary/10"
                        >
                            View all {group.label}
                            <ArrowRight className="size-4 shrink-0" />
                        </Link>
                    </DropdownMenuItem>
                )}

                <ul className="flex flex-col gap-0.5">
                    {group.categories.map((category) => (
                        <li key={category.id} className="min-w-0">
                            <DropdownMenuItem
                                asChild
                                className={DROPDOWN_ITEM_CLASSES}
                            >
                                <Link
                                    href={showCategory(category)}
                                    prefetch={LINK_PREFETCH}
                                    className={DROPDOWN_LINK_CLASSES}
                                >
                                    {category.name}
                                </Link>
                            </DropdownMenuItem>
                        </li>
                    ))}
                </ul>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * A top-level menu item that carries a dropdown. The trigger itself navigates
 * only when the admin gave the parent its own destination; otherwise it exists
 * purely to open the list.
 */
function MenuDropdown({ item }: { item: MenuNode }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={DESKTOP_TRIGGER_CLASSES}>
                {item.label}
                <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-56 p-1.5"
            >
                {item.href && (
                    <DropdownMenuItem asChild className={DROPDOWN_ITEM_CLASSES}>
                        <StorefrontNavLink
                            link={item}
                            className="mb-1 block rounded-md bg-primary/5 px-3 py-2 text-sm font-semibold text-primary no-underline transition-colors outline-none hover:bg-primary/10 data-highlighted:bg-primary/10"
                        />
                    </DropdownMenuItem>
                )}
                {item.children.map((child) => (
                    <DropdownMenuItem
                        key={child.id}
                        asChild
                        className={DROPDOWN_ITEM_CLASSES}
                    >
                        <StorefrontNavLink
                            link={child}
                            className={DROPDOWN_LINK_CLASSES}
                        />
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/** A menu item in the mobile drawer, with its dropdown flattened into an indent. */
function MobileMenuItem({
    item,
    isCurrent,
}: {
    item: MenuNode;
    isCurrent: (href: string) => boolean;
}) {
    const current = (href: string | null) =>
        href && isCurrent(href) ? ('page' as const) : undefined;

    if (item.children.length === 0) {
        return (
            <StorefrontNavLink
                link={item}
                aria-current={current(item.href)}
                className={MOBILE_LINK_CLASSES}
            />
        );
    }

    return (
        <div className="flex flex-col">
            {item.href ? (
                <StorefrontNavLink
                    link={item}
                    aria-current={current(item.href)}
                    className={MOBILE_LINK_CLASSES}
                />
            ) : (
                <span className="px-2 py-2 text-base font-semibold">
                    {item.label}
                </span>
            )}
            <ul className="flex flex-col gap-0.5 border-l pl-3">
                {item.children.map((child) => (
                    <li key={child.id}>
                        <StorefrontNavLink
                            link={child}
                            aria-current={current(child.href)}
                            className={`block rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary aria-[current=page]:text-primary ${FOCUS_CLASSES}`}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function MobileNavigationGroup({
    group,
}: {
    group: StorefrontNavigationGroup;
}) {
    const meta = GROUP_META[group.type] ?? GROUP_META.more;
    const Icon = meta.icon;
    const groupHref = GROUP_HREF[group.type];

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-bold tracking-wide">
                    {group.label}
                </h4>
            </div>
            {groupHref && (
                <Link
                    href={groupHref}
                    prefetch={LINK_PREFETCH}
                    className="mx-1 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2 text-base font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                    View all {group.label}
                    <ArrowRight className="h-4 w-4 shrink-0" />
                </Link>
            )}
            <div className="flex flex-col gap-0.5 pl-1">
                {group.categories.map((category) => (
                    <div key={category.id} className="flex flex-col">
                        <Link
                            href={showCategory(category)}
                            prefetch={LINK_PREFETCH}
                            className={MOBILE_LINK_CLASSES}
                        >
                            {category.name}
                        </Link>
                    </div>
                ))}
            </div>
        </div>
    );
}
