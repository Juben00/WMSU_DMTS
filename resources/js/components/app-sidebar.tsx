import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Building, Folder, LayoutGrid, Users, Users2, FileText, ListChecks, BarChart3 } from 'lucide-react';
import AppLogo from './app-logo';
import WmsuLogo from './WmsuLogo';
import { useSidebar } from '@/components/ui/sidebar';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Departments',
        href: '/Admin/departments',
        icon: Building,
    },
    {
        title: 'Users',
        href: '/Admin/users',
        icon: Users2,
    },
    {
        title: 'Documents',
        href: '/Admin/documents',
        icon: Folder,
    },
    {
        title: 'Published Documents',
        href: '/Admin/published-documents',
        icon: FileText,
    },
    {
        title: 'Activity Logs',
        href: '/Admin/activity-logs',
        icon: ListChecks,
    },
    {
        title: 'Analytics',
        href: '/Admin/analytics',
        icon: BarChart3,
    },
];


export function AppSidebar() {
    const { state } = useSidebar();
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch className="py-10 border-2 border-gray-200 bg-white dark:bg-neutral-900 dark:border-neutral-800">
                                {state === 'collapsed' ? (
                                    <div className="flex items-center justify-center">
                                        <WmsuLogo className="size-8" />
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center">
                                        <AppLogo />
                                    </div>
                                )}
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
