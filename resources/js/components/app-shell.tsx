import { SidebarProvider } from '@/components/ui/sidebar';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Toaster } from 'sonner';
import { useCsrfToken } from '@/hooks/use-csrf-token';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const isOpen = usePage<SharedData>().props.sidebarOpen;

    // Initialize CSRF token management
    useCsrfToken();

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">
                {children}
                <Toaster richColors position="top-right" />
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={isOpen}>
            {children}
            <Toaster richColors position="top-right" />
        </SidebarProvider>
    );
}
