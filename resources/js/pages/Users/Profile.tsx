import React, { useState, useEffect } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Navbar from '@/components/User/navbar';
import { User } from '@/types';
import Tabs from '@/components/profile/Tabs';
import ProfileInfoForm from '@/components/profile/ProfileInfoForm';
import AccountDetailsCard from '@/components/profile/AccountDetailsCard';
import ChangePasswordForm from '@/components/profile/ChangePasswordForm';
import { User as UserIcon, Settings } from 'lucide-react';
import Spinner from '@/components/spinner';

interface Props {
    user: User;
}

interface ProfileFormData {
    [key: string]: string;
    first_name: string;
    last_name: string;
    middle_name: string;
    suffix: string;
    gender: string;
    position: string;
    email: string;
}

interface PasswordFormData {
    [key: string]: string;
    current_password: string;
    password: string;
    password_confirmation: string;
}

const Profile = ({ user }: Props) => {
    const [activeTab, setActiveTab] = useState(0);

    const { data: profileData, setData: setProfileData, patch, processing: profileProcessing, errors: profileErrors } = useForm<ProfileFormData>({
        first_name: user.first_name,
        last_name: user.last_name,
        middle_name: user.middle_name || '',
        suffix: user.suffix || '',
        gender: user.gender,
        position: user.position,
        email: user.email,
    });

    const { data: passwordData, setData: setPasswordData, put, processing: passwordProcessing, errors: passwordErrors, reset: resetPassword } = useForm<PasswordFormData>({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('users.profile'), {
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Profile updated successfully',
                });
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors).join('\n');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                });
            },
        });
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('users.password.update'), {
            onSuccess: () => {
                resetPassword();
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Password updated successfully',
                });
            },
            onError: (errors) => {
                const errorMessage = Object.values(errors).join('\n');
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                });
            },
        });
    };

    return (
        <>
            {(profileProcessing || passwordProcessing) && <Spinner />}
            <Head title="Profile Settings" />
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                                    <UserIcon className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
                                    <p className="text-sm md:text-md lg:text-lg text-gray-600 dark:text-gray-300 mt-1">Manage your account information and preferences</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                                    <Settings className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Account Settings</h2>
                            </div>
                            <Tabs
                                className="text-sm md:text-md lg:text-lg"
                                tabs={["Account Details", "Personal Information", "Change Password"]}
                                current={activeTab}
                                onChange={setActiveTab}
                            />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-8">
                            {activeTab === 0 && (
                                <AccountDetailsCard user={user} />
                            )}
                            {activeTab === 1 && (
                                <ProfileInfoForm
                                    data={profileData}
                                    errors={profileErrors}
                                    processing={profileProcessing}
                                    onChange={setProfileData}
                                    onSubmit={handleProfileSubmit}
                                />
                            )}
                            {activeTab === 2 && (
                                <ChangePasswordForm
                                    data={passwordData}
                                    errors={passwordErrors}
                                    processing={passwordProcessing}
                                    onChange={setPasswordData}
                                    onSubmit={handlePasswordSubmit}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;
