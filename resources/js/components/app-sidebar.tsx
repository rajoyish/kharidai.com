import { Link } from '@inertiajs/react';
import { BookOpen, LayoutGrid, ShoppingCart, LayoutDashboard, Users, ClipboardList, Package, Tags } from 'lucide-react';
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
// import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Home',
        href: '/',
        icon: LayoutGrid,
    },
    {
        title: 'My Orders',
        href: '/orders',
        icon: ShoppingCart,
    },
];

import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

export function AppSidebar() {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();

    const adminNavItems: NavItem[] = [
        {
            title: 'Admin Dashboard',
            href: '/admin',
            icon: LayoutDashboard,
        },
        {
            title: 'User Management',
            href: '/admin/users',
            icon: Users,
        },
        {
            title: 'Orders',
            href: '/admin/orders',
            icon: ClipboardList,
        },
        {
            title: 'Products',
            href: '/admin/products',
            icon: Package,
        },
        {
            title: 'Categories',
            href: '/admin/categories',
            icon: Tags,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/" prefetch>
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
                <NavMain items={mainNavItems} />
                {auth.user.is_admin && <NavMain items={adminNavItems} />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
