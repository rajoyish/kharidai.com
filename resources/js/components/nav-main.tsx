import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
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
                        {items.map((item) => (
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
                        ))}
                    </SidebarMenu>
                </CollapsibleContent>
            </SidebarGroup>
        </Collapsible>
    );
}
