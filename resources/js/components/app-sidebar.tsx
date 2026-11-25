import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Briefcase,
    BriefcaseBusiness,
    CalendarDays,
    CreditCard,
    FileText,
    Gauge,
    HandCoins,
    LayoutGrid,
    ListTree,
    Mail,
    Newspaper,
    Package,
    Receipt,
    Repeat,
    ShoppingCart,
    Tags,
    Truck,
    Users,
    Handshake,
    LayoutDashboard,
    ShoppingBag,
    Store,
    Contact,
    PenLine,
    Settings,
    UserRound,
    ChevronsDownUp,
    ChevronsUpDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Button } from '@/components/ui/button';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { LINK_PREFETCH } from '@/lib/prefetch';
import { home } from '@/routes';
import { index as servicesIndex } from '@/routes/account/services';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as adminCategoriesIndex } from '@/routes/admin/categories';
import { index as adminMenusIndex } from '@/routes/admin/menus';
import { index as adminNewslettersIndex } from '@/routes/admin/newsletters';
import { index as adminNotificationsIndex } from '@/routes/admin/notifications';
import { index as adminOrdersIndex } from '@/routes/admin/orders';
import { index as adminPagesIndex } from '@/routes/admin/pages';
import { index as adminPaymentMethodsIndex } from '@/routes/admin/payment-methods';
import { index as adminPostsIndex } from '@/routes/admin/posts';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminServicesIndex } from '@/routes/admin/services';
import { index as adminShippingIndex } from '@/routes/admin/shipping';
import { index as adminSubscriptionsIndex } from '@/routes/admin/subscriptions';
import { index as adminSuppliersIndex } from '@/routes/admin/suppliers';
import { index as adminTithesIndex } from '@/routes/admin/tithes';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as ordersIndex } from '@/routes/orders';
import { index as subscriptionsIndex } from '@/routes/subscriptions';
import { index as userNotificationsIndex } from '@/routes/user/notifications';
import type { NavItem, SharedData } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Home',
        href: home(),
        icon: LayoutGrid,
    },
    {
        title: 'My Orders',
        href: ordersIndex(),
        icon: ShoppingCart,
    },
    {
        title: 'My Subscriptions',
        href: subscriptionsIndex(),
        icon: CalendarDays,
    },
    {
        title: 'My Services',
        href: servicesIndex(),
        icon: Briefcase,
    },
];

// Admins reach their notifications through the admin "Customers" section, so
// this Personal entry is appended only for non-admin users.
const userNotificationsNavItem: NavItem = {
    title: 'Notifications',
    href: userNotificationsIndex(),
    icon: Bell,
};

type NavSection = {
    /** Stable id stored in the folded-sections cookie. */
    key: string;
    label: string;
    icon: LucideIcon;
    items: NavItem[];
};

const COLLAPSED_SECTIONS_COOKIE = 'sidebar_collapsed_sections';
const COLLAPSED_SECTIONS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Remembers folded sections so the server can render them folded next time. */
const persistCollapsedSections = (sections: string[]): void => {
    document.cookie = `${COLLAPSED_SECTIONS_COOKIE}=${sections.join(',')};path=/;max-age=${COLLAPSED_SECTIONS_COOKIE_MAX_AGE};SameSite=Lax`;
};

/**
 * Admin navigation, grouped by the job each screen serves so related
 * screens sit together instead of in one long flat list.
 */
const adminNavSections: NavSection[] = [
    {
        key: 'overview',
        icon: LayoutDashboard,
        label: 'Overview',
        items: [
            {
                title: 'Admin Dashboard',
                href: adminDashboard(),
                icon: Gauge,
            },
        ],
    },
    {
        key: 'sales',
        icon: ShoppingBag,
        label: 'Sales',
        items: [
            {
                title: 'Orders',
                href: adminOrdersIndex(),
                icon: Receipt,
            },
            {
                title: 'Subscriptions',
                href: adminSubscriptionsIndex(),
                icon: Repeat,
            },
            {
                title: 'Services',
                href: adminServicesIndex(),
                icon: BriefcaseBusiness,
            },
            {
                title: 'Tithes',
                href: adminTithesIndex(),
                icon: HandCoins,
            },
        ],
    },
    {
        key: 'catalog',
        icon: Store,
        label: 'Catalog',
        items: [
            {
                title: 'Products',
                href: adminProductsIndex(),
                icon: Package,
            },
            {
                title: 'Categories',
                href: adminCategoriesIndex(),
                icon: Tags,
            },
            {
                title: 'Suppliers',
                href: adminSuppliersIndex(),
                icon: Handshake,
            },
        ],
    },
    {
        key: 'customers',
        icon: Contact,
        label: 'Customers',
        items: [
            {
                title: 'Users',
                href: adminUsersIndex(),
                icon: Users,
            },
            {
                title: 'Newsletters',
                href: adminNewslettersIndex(),
                icon: Mail,
            },
            {
                title: 'Notifications',
                href: adminNotificationsIndex(),
                icon: Bell,
            },
        ],
    },
    {
        key: 'content',
        icon: PenLine,
        label: 'Content',
        items: [
            {
                title: 'Blog Posts',
                href: adminPostsIndex(),
                icon: Newspaper,
            },
            {
                title: 'Pages',
                href: adminPagesIndex(),
                icon: FileText,
            },
            {
                title: 'Menus',
                href: adminMenusIndex(),
                icon: ListTree,
            },
        ],
    },
    {
        key: 'settings',
        icon: Settings,
        label: 'Settings',
        items: [
            {
                title: 'Shipping',
                href: adminShippingIndex(),
                icon: Truck,
            },
            {
                title: 'Payment Methods',
                href: adminPaymentMethodsIndex(),
                icon: CreditCard,
            },
        ],
    },
];

/** Every foldable section, so they can all be folded or unfolded at once. */
const foldableSectionKeys: string[] = [
    'personal',
    ...adminNavSections.map((section) => section.key),
];

export function AppSidebar() {
    const { auth, sidebarCollapsedSections } = usePage<SharedData>().props;
    const { state, isMobile } = useSidebar();

    // `state` tracks the desktop sidebar even on mobile, where the full-width
    // sheet is shown instead of the icon rail.
    const isIconRail = state === 'collapsed' && !isMobile;

    // Seeded from the cookie the server read, so SSR and the first client
    // render agree on which sections are folded.
    const [collapsedSections, setCollapsedSections] = useState<string[]>(
        () => sidebarCollapsedSections ?? [],
    );

    const updateCollapsedSections = (next: string[]): void => {
        setCollapsedSections(next);
        persistCollapsedSections(next);
    };

    const setSectionOpen = (key: string, isOpen: boolean): void => {
        updateCollapsedSections(
            isOpen
                ? collapsedSections.filter((section) => section !== key)
                : [...new Set([...collapsedSections, key])],
        );
    };

    const areAllSectionsCollapsed = foldableSectionKeys.every((key) =>
        collapsedSections.includes(key),
    );

    const toggleAllSections = (): void => {
        updateCollapsedSections(
            areAllSectionsCollapsed ? [] : foldableSectionKeys,
        );
    };

    const sectionToggleProps = (key: string) => ({
        open: !collapsedSections.includes(key),
        onOpenChange: (isOpen: boolean) => setSectionOpen(key, isOpen),
    });

    // `auth.user` is null for guests. Under SSR a throw here is not a local
    // failure: Inertia falls back to client rendering for the whole page, so
    // the crawler receives an empty root and the page silently loses its SEO.
    const personalNavItems: NavItem[] = auth.user?.is_admin
        ? mainNavItems
        : [...mainNavItems, userNotificationsNavItem];

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={home()} prefetch={LINK_PREFETCH}>
                                <div className="flex items-center justify-center">
                                    {isIconRail ? (
                                        <AppLogoIcon className="size-6 text-primary" />
                                    ) : (
                                        <AppLogo className="ml-1 h-8 w-auto" />
                                    )}
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {/* Only admins have enough sections for folding to help. The
                    icon rail shows every section, so the toggle hides there. */}
                {auth.user?.is_admin && (
                    <div className="flex justify-end px-2 group-data-[collapsible=icon]:hidden">
                        <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={toggleAllSections}
                            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        >
                            {areAllSectionsCollapsed ? (
                                <ChevronsUpDown />
                            ) : (
                                <ChevronsDownUp />
                            )}
                            {areAllSectionsCollapsed
                                ? 'Expand all'
                                : 'Collapse all'}
                        </Button>
                    </div>
                )}
                <NavMain
                    items={personalNavItems}
                    label="Personal"
                    icon={UserRound}
                    {...(auth.user?.is_admin
                        ? sectionToggleProps('personal')
                        : {})}
                />
                {auth.user?.is_admin &&
                    adminNavSections.map((section) => (
                        <NavMain
                            key={section.key}
                            items={section.items}
                            label={section.label}
                            icon={section.icon}
                            {...sectionToggleProps(section.key)}
                        />
                    ))}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
