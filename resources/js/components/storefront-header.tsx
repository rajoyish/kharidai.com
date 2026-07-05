import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Cpu, LayoutGrid, Menu, Package, ShoppingCart, Sparkles, User } from 'lucide-react';
import type { ComponentType } from 'react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { home, login } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as cartIndex } from '@/routes/cart';
import { show as showCategory } from '@/routes/categories';
import { index as digitalProducts } from '@/routes/digital-products';
import { index as ordersIndex } from '@/routes/orders';
import { index as physicalProducts } from '@/routes/physical-products';
import { index as services } from '@/routes/services';
import type { SharedData } from '@/types';
import type { StorefrontNavigationGroup, StorefrontNavigationGroupType } from '@/types/storefront';

const GROUP_META: Record<StorefrontNavigationGroupType, { icon: ComponentType<{ className?: string }>; description: string }> = {
    digital: { icon: Cpu, description: 'Software, subscriptions & downloads' },
    physical: { icon: Package, description: 'Real products, shipped to your door' },
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

export function StorefrontHeader({
    hideNavigation = false,
}: {
    hideNavigation?: boolean;
}) {
    const { auth, cartCount, storefront } = usePage<SharedData>().props;
    const groups = storefront?.groups ?? [];
    const accountHref = auth.user
        ? auth.user.is_admin
            ? adminDashboard()
            : ordersIndex()
        : login();
    const accountLabel = auth.user?.name ?? 'Account';

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-8 lg:gap-12">
                    <Link href={home()} prefetch className="flex shrink-0 items-center gap-2">
                        <AppLogo className="h-8 w-auto md:h-10" />
                    </Link>

                    {/* Main Navigation (Center-Left) */}
                    {!hideNavigation && (
                        <div className="hidden md:flex md:items-center md:gap-1">
                            <Link
                                href={home()}
                                prefetch
                                className="rounded-md px-3 py-2 text-sm font-semibold transition-colors hover:text-primary"
                            >
                                Home
                            </Link>
                            <NavigationMenu viewport={false}>
                                <NavigationMenuList className="gap-0">
                                    {groups.map((group) => {
                                        const Icon = GROUP_META[group.type]?.icon ?? LayoutGrid;

                                        return (
                                            <NavigationMenuItem key={group.type}>
                                                <NavigationMenuTrigger className="h-auto gap-1.5 bg-transparent px-3 py-2 text-sm font-semibold hover:bg-primary/10 hover:text-primary data-[state=open]:bg-primary/10 data-[state=open]:text-primary">
                                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                                    {group.label}
                                                </NavigationMenuTrigger>
                                                <NavigationMenuContent>
                                                    <NavigationGroupPanel group={group} />
                                                </NavigationMenuContent>
                                            </NavigationMenuItem>
                                        );
                                    })}
                                </NavigationMenuList>
                            </NavigationMenu>
                        </div>
                    )}
                </div>

                {/* User Actions (Right) Desktop */}
                <div className="hidden items-center gap-6 md:flex">
                    <Link href={accountHref} prefetch className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary">
                        <User className="h-5 w-5 shrink-0" />
                        <span className="max-w-40 truncate">{accountLabel}</span>
                    </Link>
                    <Link href={cartIndex()} prefetch className="relative flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary">
                        <div className="relative">
                            <ShoppingCart className="h-5 w-5" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-bold text-primary-foreground">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span>Cart</span>
                    </Link>
                </div>

                {/* Mobile Menu (Right) */}
                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10">
                                <Menu className="h-6 w-6" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-80 overflow-y-auto sm:w-96">
                            <SheetHeader>
                                <SheetTitle className="text-left">Menu</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 flex flex-col gap-6 px-4 pb-8">
                                {!hideNavigation && (
                                    <>
                                        <Link
                                            href={home()}
                                            prefetch
                                            className="rounded-lg px-2 py-2 text-base font-semibold transition-colors hover:bg-primary/10 hover:text-primary"
                                        >
                                            Home
                                        </Link>
                                        {groups.map((group) => (
                                            <MobileNavigationGroup key={group.type} group={group} />
                                        ))}
                                    </>
                                )}
                                <div className="flex flex-col gap-1 border-t pt-6">
                                    <Link href={accountHref} prefetch className="flex items-center gap-3 rounded-lg px-2 py-2 text-base font-medium transition-colors hover:bg-primary/10 hover:text-primary">
                                        <User className="h-5 w-5 shrink-0" />
                                        <span className="truncate">{accountLabel}</span>
                                    </Link>
                                    <Link href={cartIndex()} prefetch className="relative flex items-center gap-3 rounded-lg px-2 py-2 text-base font-medium transition-colors hover:bg-primary/10 hover:text-primary">
                                        <div className="relative">
                                            <ShoppingCart className="h-5 w-5" />
                                            {cartCount > 0 && (
                                                <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-bold text-primary-foreground">
                                                    {cartCount}
                                                </span>
                                            )}
                                        </div>
                                        <span>Cart</span>
                                    </Link>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}

function NavigationGroupPanel({ group }: { group: StorefrontNavigationGroup }) {
    const meta = GROUP_META[group.type] ?? GROUP_META.more;
    const Icon = meta.icon;
    const groupHref = GROUP_HREF[group.type];

    return (
        <div className="w-[min(94vw,320px)] p-4">
            <div className="mb-3 flex items-center gap-3 border-b pb-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{group.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{meta.description}</p>
                </div>
            </div>

            {groupHref && (
                <NavigationMenuLink asChild>
                    <Link
                        href={groupHref}
                        prefetch
                        className="mb-1 flex flex-row! items-center justify-between rounded-md bg-primary/5 px-3 py-2 text-sm font-semibold text-primary no-underline outline-none transition-colors hover:bg-primary/10 focus:bg-primary/10"
                    >
                        View all {group.label}
                        <ArrowRight className="size-4 shrink-0" />
                    </Link>
                </NavigationMenuLink>
            )}

            <ul className="flex flex-col gap-0.5">
                {group.categories.map((category) => (
                    <li key={category.id} className="min-w-0">
                        <NavigationMenuLink asChild>
                            <Link
                                href={showCategory(category)}
                                prefetch
                                className="block truncate rounded-md px-3 py-2 text-left text-sm font-semibold text-foreground no-underline outline-none transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                            >
                                {category.name}
                            </Link>
                        </NavigationMenuLink>
                        {category.children && category.children.length > 0 && (
                            <ul className="mt-0.5 mb-2 ml-3 flex flex-col gap-0.5 border-l border-border pl-2">
                                {category.children.map((child) => (
                                    <li key={child.id} className="min-w-0">
                                        <NavigationMenuLink asChild>
                                            <Link
                                                href={showCategory(child)}
                                                prefetch
                                                className="block truncate rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground no-underline outline-none transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                                            >
                                                {child.name}
                                            </Link>
                                        </NavigationMenuLink>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function MobileNavigationGroup({ group }: { group: StorefrontNavigationGroup }) {
    const meta = GROUP_META[group.type] ?? GROUP_META.more;
    const Icon = meta.icon;
    const groupHref = GROUP_HREF[group.type];

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 px-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-bold tracking-wide">{group.label}</h4>
            </div>
            {groupHref && (
                <Link
                    href={groupHref}
                    prefetch
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
                            prefetch
                            className="rounded-lg px-3 py-2 text-base font-semibold transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                            {category.name}
                        </Link>
                        {category.children && category.children.length > 0 && (
                            <div className="mb-1 ml-4 flex flex-col gap-0.5 border-l pl-3">
                                {category.children.map((child) => (
                                    <Link
                                        key={child.id}
                                        href={showCategory(child)}
                                        prefetch
                                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                    >
                                        {child.name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
