import { FormEventHandler } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import { LoaderCircle, Check } from 'lucide-react';
import Spinner from '@/components/spinner';

interface FirstTimePasswordForm {
    password: string;
    password_confirmation: string;
}

export default function FirstTimePassword() {
    const { data, setData, post, processing, errors, reset } = useForm<Required<FirstTimePasswordForm>>({
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.update'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            {processing && <Spinner />}
            <AuthLayout title="WMSU" description="Document Management and Tracking System">
                <Head title="Change Password" />

                <div className="w-full max-w-md mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to WMSU DMTS</h1>
                        <p className="text-gray-600 dark:text-gray-300">Please change your password to continue</p>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-gray-700 dark:text-gray-200">
                                New Password <span className="text-red-600 dark:text-red-400">*</span>
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className={`${errors.password ? "border-red-500 dark:border-red-400" : ""} bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white`}
                                placeholder="Enter your new password"
                                required
                                autoFocus
                            />
                            {errors.password && (
                                <InputError message={errors.password} />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password_confirmation" className="text-gray-700 dark:text-gray-200">
                                Confirm New Password <span className="text-red-600 dark:text-red-400">*</span>
                            </Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                className={`${errors.password_confirmation ? "border-red-500 dark:border-red-400" : ""} bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white`}
                                placeholder="Confirm your new password"
                                required
                            />
                            {errors.password_confirmation && (
                                <InputError message={errors.password_confirmation} />
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={processing}>
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin mr-2" />}
                            Change Password & Continue
                        </Button>
                    </form>
                </div>
            </AuthLayout>
        </>
    );
}
