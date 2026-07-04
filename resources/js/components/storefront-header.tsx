import { Link, usePage } from '@inertiajs/react';
import { Menu, ShoppingCart, User } from 'lucide-react';
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
import { index as ordersIndex } from '@/routes/orders';
import type { SharedData } from '@/types';

export function StorefrontHeader({
    hideNavigation = false,
}: {
    hideNavigation?: boolean;
}) {
    const { auth, cartCount, storefront } = usePage<SharedData>().props;
    const categories = storefront?.categories || [];
    const accountHref = auth.user
        ? auth.user.is_admin
            ? adminDashboard()
            : ordersIndex()
        : login();

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                <div className="flex items-center gap-8 lg:gap-12">
                    <Link href={home()} prefetch className="flex shrink-0 items-center gap-2">
                        <AppLogo className="h-8 w-auto md:h-10" />
                    </Link>

                    {/* Main Navigation (Center-Left) */}
                    {!hideNavigation && (
                        <div className="hidden md:flex md:items-center md:gap-6">
                            <Link href={home()} prefetch className="text-sm font-semibold transition-colors hover:text-primary">
                                Home
                            </Link>
                            <NavigationMenu>
                                <NavigationMenuList>
                                    <NavigationMenuItem>
                                        <NavigationMenuTrigger className="h-auto bg-transparent px-2 py-1 text-sm font-semibold hover:bg-transparent hover:text-primary data-[state=open]:bg-transparent data-[state=open]:text-primary">
                                            Categories
                                        </NavigationMenuTrigger>
                                        <NavigationMenuContent>
                                            <div className="grid w-100 grid-cols-2 gap-3 p-4">
                                                {categories.map((category) => (
                                                    <NavigationMenuLink asChild key={category.id}>
                                                        <Link
                                                            href={showCategory(category)}
                                                            prefetch
                                                            className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                                                        >
                                                            <div className="text-sm font-medium leading-none">
                                                                {category.name}
                                                            </div>
                                                        </Link>
                                                    </NavigationMenuLink>
                                                ))}
                                            </div>
                                        </NavigationMenuContent>
                                    </NavigationMenuItem>
                                </NavigationMenuList>
                            </NavigationMenu>
                        </div>
                    )}
                </div>

                {/* User Actions (Right) Desktop */}
                <div className="hidden items-center gap-6 md:flex">
                    <Link href={accountHref} prefetch className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-primary">
                        <User className="h-5 w-5" />
                        <span>Account</span>
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
                        <SheetContent side="right" className="w-75 sm:w-100">
                            <SheetHeader>
                                <SheetTitle className="text-left">Menu</SheetTitle>
                            </SheetHeader>
                            <div className="mt-6 flex flex-col gap-8 px-4">
                                {!hideNavigation && (
                                    <>
                                        <div className="flex flex-col gap-4">
                                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Browse</h4>
                                            <div className="flex flex-col gap-3 pl-2">
                                                <Link href={home()} prefetch className="py-1 text-base font-medium transition-colors hover:text-primary">
                                                    Home
                                                </Link>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-4">
                                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Categories</h4>
                                            <div className="flex flex-col gap-3 pl-2">
                                                {categories.map((category) => (
                                                    <Link
                                                        key={category.id}
                                                        href={showCategory(category)}
                                                        prefetch
                                                        className="py-1 text-base font-medium transition-colors hover:text-primary"
                                                    >
                                                        {category.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                                <div className="flex flex-col gap-4 border-t pt-6">
                                    <Link href={accountHref} prefetch className="flex items-center gap-3 py-2 text-base font-medium transition-colors hover:text-primary">
                                        <User className="h-5 w-5" />
                                        <span>Account</span>
                                    </Link>
                                    <Link href={cartIndex()} prefetch className="relative flex items-center gap-3 py-2 text-base font-medium transition-colors hover:text-primary">
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
