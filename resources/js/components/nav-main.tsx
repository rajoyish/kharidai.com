import { Link } from '@inertiajs/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { LINK_PREFETCH } from '@/lib/prefetch';
import type { NavItem } from '@/types';

export function NavMain({
    items = [],
    label = 'Platform',
    icon: SectionIcon,
    open = true,
    onOpenChange,
}: {
    items: NavItem[];
    label?: string;
    /** Shown beside the section label. */
    icon?: LucideIcon;
    /** Whether the section's items are shown. Ignored without `onOpenChange`. */
    open?: boolean;
    /** Makes the section foldable from its label when provided. */
    onOpenChange?: (open: boolean) => void;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const { state, isMobile } = useSidebar();

    const isCollapsible = onOpenChange !== undefined;

    // The icon-only rail hides labels, so a folded section would have no way
    // back open there. Every section stays open while the rail is showing.
    // `state` tracks the desktop sidebar even on mobile, where the full-width
    // sheet is shown instead of the rail, so mobile never counts as the rail.
    const isIconRail = state === 'collapsed' && !isMobile;
    const isOpen = !isCollapsible || isIconRail || open;

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={isIconRail ? undefined : onOpenChange}
            asChild
        >
            <SidebarGroup className="px-2 py-0">
                {isCollapsible ? (
                    <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="group/section-label w-full cursor-pointer gap-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                            {SectionIcon && <SectionIcon />}
                            {label}
                            <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=closed]/section-label:-rotate-90" />
                        </CollapsibleTrigger>
                    </SidebarGroupLabel>
                ) : (
                    <SidebarGroupLabel className="gap-2">
                        {SectionIcon && <SectionIcon />}
                        {label}
                    </SidebarGroupLabel>
                )}
                <CollapsibleContent>
                    {/* Indented under its label; the icon rail needs the full width. */}
                    <SidebarMenu className="pl-3 group-data-[collapsible=icon]:pl-0">
                        {items.map((item) =>
                            item.items?.length ? (
                                <NavBranch
                                    key={item.title}
                                    item={item}
                                    subItems={item.items}
                                    isIconRail={isIconRail}
                                />
                            ) : (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentUrl(item.href)}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link
                                            href={item.href}
                                            prefetch={LINK_PREFETCH}
                                        >
                                            {item.icon && <item.icon />}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ),
                        )}
                    </SidebarMenu>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}

/**
 * An item with sub-pages, such as Orders › Deleted.
 *
 * In the full sidebar (desktop and the mobile sheet) the item stays a link and
 * a chevron beside it folds the sub-pages out beneath. The icon rail has no
 * room to indent, so there the icon opens the sub-pages as a flyout instead.
 */
function NavBranch({
    item,
    subItems,
    isIconRail,
}: {
    item: NavItem;
    subItems: NavItem[];
    isIconRail: boolean;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();

    const isBranchActive =
        isCurrentUrl(item.href) ||
        subItems.some((subItem) => isCurrentUrl(subItem.href));

    // Null until the admin toggles it, so the branch follows the page: open
    // while one of its pages is showing, folded otherwise. Derived rather than
    // synced in an effect so SSR and hydration agree.
    const [toggledOpen, setToggledOpen] = useState<boolean | null>(null);
    const isOpen = toggledOpen ?? isBranchActive;

    // The mobile sheet stays over the page after an Inertia visit, so a tap on
    // a sub-page closes it to show where it went.
    const closeMobileSheet = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    if (isIconRail) {
        return (
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            isActive={isBranchActive}
                            aria-label={`${item.title} menu`}
                        >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className="min-w-48"
                    >
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            {item.title}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {subItems.map((subItem) => (
                            <DropdownMenuItem
                                key={subItem.title}
                                asChild
                                className={
                                    isCurrentUrl(subItem.href)
                                        ? 'bg-accent-surface font-medium'
                                        : undefined
                                }
                            >
                                <Link
                                    href={subItem.href}
                                    prefetch={LINK_PREFETCH}
                                >
                                    {subItem.icon && <subItem.icon />}
                                    {subItem.title}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setToggledOpen} asChild>
            <SidebarMenuItem>
                {/* Highlighted only while folded: open, the active sub-page
                    carries the highlight so it is not shown twice. */}
                <SidebarMenuButton
                    asChild
                    isActive={isBranchActive && !isOpen}
                    tooltip={{ children: item.title }}
                    className={isBranchActive ? 'font-medium' : undefined}
                >
                    <Link
                        href={item.href}
                        prefetch={LINK_PREFETCH}
                        onClick={closeMobileSheet}
                    >
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
                <CollapsibleTrigger asChild>
                    <SidebarMenuAction
                        aria-label={`${isOpen ? 'Hide' : 'Show'} ${item.title} pages`}
                        className="text-sidebar-foreground/50 transition-transform hover:text-sidebar-accent-foreground data-[state=open]:rotate-90 [&>svg]:size-3.5"
                    >
                        <ChevronRight />
                    </SidebarMenuAction>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub className="mr-0 pr-0">
                        {subItems.map((subItem) => (
                            <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                    asChild
                                    isActive={isCurrentUrl(subItem.href)}
                                    className="h-9 md:h-7"
                                >
                                    <Link
                                        href={subItem.href}
                                        prefetch={LINK_PREFETCH}
                                        onClick={closeMobileSheet}
                                    >
                                        {subItem.icon && <subItem.icon />}
                                        <span>{subItem.title}</span>
                                    </Link>
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}
