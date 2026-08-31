import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    Briefcase,
    CalendarDays,
    ClipboardList,
    CreditCard,
    FileText,
    HandCoins,
    LayoutDashboard,
    LayoutGrid,
    Menu,
    Newspaper,
    Package,
    ShoppingCart,
    Tags,
    Truck,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
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
import { index as adminNotificationsIndex } from '@/routes/admin/notifications';
import { index as adminOrdersIndex } from '@/routes/admin/orders';
import { index as adminPagesIndex } from '@/routes/admin/pages';
import { index as adminPaymentMethodsIndex } from '@/routes/admin/payment-methods';
import { index as adminPostsIndex } from '@/routes/admin/posts';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminServicesIndex } from '@/routes/admin/services';
import { index as adminShippingIndex } from '@/routes/admin/shipping';
import { index as adminSubscriptionsIndex } from '@/routes/admin/subscriptions';
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

// Admins reach their notifications through the "Store Management" section, so
// this Personal entry is appended only for non-admin users.
const userNotificationsNavItem: NavItem = {
    title: 'Notifications',
    href: userNotificationsIndex(),
    icon: Bell,
};

const adminNavItems: NavItem[] = [
    {
        title: 'Admin Dashboard',
        href: adminDashboard(),
        icon: LayoutDashboard,
    },
    {
        title: 'User Management',
        href: adminUsersIndex(),
        icon: Users,
    },
    {
        title: 'Orders',
        href: adminOrdersIndex(),
        icon: ClipboardList,
    },
    {
        title: 'Notifications',
        href: adminNotificationsIndex(),
        icon: Bell,
    },
    {
        title: 'Subscriptions',
        href: adminSubscriptionsIndex(),
        icon: CalendarDays,
    },
    {
        title: 'Tithes',
        href: adminTithesIndex(),
        icon: HandCoins,
    },
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
        icon: Menu,
    },
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
    {
        title: 'Services',
        href: adminServicesIndex(),
        icon: Briefcase,
    },
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();

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
                                    {state === 'collapsed' ? (
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
                <NavMain items={personalNavItems} label="Personal" />
                {auth.user?.is_admin && (
                    <NavMain items={adminNavItems} label="Store Management" />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
