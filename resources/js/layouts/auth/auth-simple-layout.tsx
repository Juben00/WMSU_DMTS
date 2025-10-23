import AppLogoIcon from '@/components/app-logo-icon';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import WmsuLogo from '@/components/WmsuLogo';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div
            className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10 dark:bg-gray-900"
            style={{
                backgroundImage: 'url(/images/login-background-reduced.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div className="w-full max-w-sm border border-gray-400 dark:border-gray-600 p-10 rounded-lg bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 backdrop-blur-sm">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                            <div className="mb-1 flex size-28 items-center justify-center rounded-md">
                                <WmsuLogo className="fill-current text-[var(--foreground)] dark:text-white" />
                            </div>
                            <span className="sr-only">{title}</span>
                        </Link>

                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium text-gray-900 dark:text-white">{title}</h1>
                            <p className="text-center text-sm text-muted-foreground dark:text-gray-300">{description}</p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
