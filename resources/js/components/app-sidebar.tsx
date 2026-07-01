import { Link, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ClipboardList,
    HandCoins,
    LayoutDashboard,
    LayoutGrid,
    Package,
    ShoppingCart,
    Tags,
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
import { home } from '@/routes';
import { dashboard as adminDashboard } from '@/routes/admin';
import { index as adminCategoriesIndex } from '@/routes/admin/categories';
import { index as adminOrdersIndex } from '@/routes/admin/orders';
import { index as adminProductsIndex } from '@/routes/admin/products';
import { index as adminSubscriptionsIndex } from '@/routes/admin/subscriptions';
import { index as adminTithesIndex } from '@/routes/admin/tithes';
import { index as adminUsersIndex } from '@/routes/admin/users';
import { index as ordersIndex } from '@/routes/orders';
import { index as subscriptionsIndex } from '@/routes/subscriptions';
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
];

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
];

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={home()} prefetch>
                                <div className="flex items-center justify-center">
                                    {state === 'collapsed' ? (
                                        <AppLogoIcon className="size-6 text-primary" />
                                    ) : (
                                        <AppLogo className="h-8 w-auto ml-1" />
                                    )}
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} label="Personal" />
                {auth.user.is_admin && <NavMain items={adminNavItems} label="Store Management" />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
