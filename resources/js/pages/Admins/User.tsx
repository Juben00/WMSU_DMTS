import { Head, } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Plus, Trash2, Lock, Unlock, Eye, Pencil, Key } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AddNewAdmin from '@/components/Admin/AddAdmin';
import EditAdmin from '@/components/Admin/EditAdmin';
import { getFullName } from '@/lib/utils';
import Swal from 'sweetalert2';
import AddNewUser from '@/components/Admin/AddUser';
import Spinner from '@/components/spinner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admins',
        href: '/admins',
    },
];


interface Props {
    users: User[];
    departments: {
        id: number;
        name: string;
        description: string;
        type: 'office' | 'college';
    }[];
    departmentsForUserCreation: {
        id: number;
        name: string;
        description: string;
        type: 'office' | 'college';
    }[];
    auth: {
        user: {
            id: number;
        };
    };
}

export default function Admins({ users, departments, auth, departmentsForUserCreation }: Props) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedUserType, setSelectedUserType] = useState<'admin' | 'user'>('admin');
    const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isPasswordChangeDialogOpen, setIsPasswordChangeDialogOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const { processing, delete: destroy, patch, data, setData, post, errors, reset, put } = useForm({
        first_name: '',
        last_name: '',
        middle_name: '',
        suffix: '',
        gender: '',
        position: '',
        department_id: '',
        email: '',
        role: 'admin',
        new_password: '',
        confirm_password: '',
    });

    const handleToggleStatus = (user: User) => {
        const action = user.is_active ? 'deactivate' : 'activate';
        Swal.fire({
            title: 'Are you sure?',
            text: `You won't be able to revert this!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                patch(route('admins.toggle-status', user.id), {
                    onSuccess: () => {
                        toast.success(`User ${action}d successfully`);
                    },
                    onError: (errors: { [key: string]: string }) => {
                        const errorMessages = Object.values(errors).join('\n');
                        toast.error(`Failed to ${action} user. Please try again.` + errorMessages);
                    }
                });
            }
        });
    };

    const handleDeleteAdmin = (user: User) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'You won\'t be able to revert this!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                destroy(route('admins.destroy', user.id), {
                    onSuccess: () => {
                        toast.success('User deleted successfully');
                    },
                    onError: (errors: { [key: string]: string }) => {
                        const errorMessages = Object.values(errors).join('\n');
                        toast.error('Failed to delete user. Please try again.' + errorMessages);
                    }
                });
            }
        });
    };

    const handleViewAdmin = (user: User) => {
        setSelectedAdmin(user);
        setIsViewDialogOpen(true);
    };

    const handleEditAdmin = (user: User) => {
        setSelectedAdmin(user);
        // Initialize form data with the selected admin's data
        setData('first_name', user.first_name);
        setData('last_name', user.last_name);
        setData('middle_name', user.middle_name || '');
        setData('suffix', user.suffix || '');
        setData('gender', user.gender);
        setData('position', user.position);
        setData('department_id', user.department?.id?.toString() || '');
        setData('email', user.email);
        setData('role', user.role);
        setIsEditDialogOpen(true);
    };

    const handlePasswordChange = (user: User) => {
        setSelectedAdmin(user);
        setData('new_password', '');
        setData('confirm_password', '');
        setIsPasswordChangeDialogOpen(true);
    };

    const handlePasswordChangeSubmit = () => {
        if (data.new_password !== data.confirm_password) {
            toast.error('Passwords do not match');
            return;
        }

        if (data.new_password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        // Use router.patch directly to send only password data
        router.patch(route('admins.change-password', selectedAdmin?.id), {
            new_password: data.new_password,
            new_password_confirmation: data.confirm_password,
        }, {
            onSuccess: () => {
                toast.success('Password changed successfully');
                setIsPasswordChangeDialogOpen(false);
                setData('new_password', '');
                setData('confirm_password', '');
            },
            onError: (errors: { [key: string]: string }) => {
                const errorMessages = Object.values(errors).join('\n');
                toast.error('Failed to change password. Please try again.' + errorMessages);
            }
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {processing && <Spinner />}
            <Head title="Admin Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                <div className="flex gap-6 overflow-auto items-center w-full">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                            <p className="text-muted-foreground">
                                Manage all users
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                        <p className="text-sm font-semibold dark:text-white">Search:</p>
                        <Input type="text" placeholder="Search User" onChange={(e) => setFilter(e.target.value)} value={filter} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) { reset(); setSelectedUserType('admin'); setData('role', 'admin'); } }}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle className="text-3xl font-bold text-gray-900 dark:text-white"   >Create New {selectedUserType === 'admin' ? 'Admin' : 'User'}</DialogTitle>
                                </DialogHeader>
                                <div className="">
                                    <Label htmlFor="user_type">User Type</Label>
                                    <div className="mt-2 flex gap-2">
                                        <Button
                                            variant={selectedUserType === 'admin' ? 'default' : 'outline'}
                                            onClick={() => { setSelectedUserType('admin'); setData('role', 'admin'); }}
                                        >
                                            Admin
                                        </Button>
                                        <Button
                                            variant={selectedUserType === 'user' ? 'default' : 'outline'}
                                            onClick={() => { setSelectedUserType('user'); setData('role', 'user'); }}
                                        >
                                            User
                                        </Button>
                                    </div>
                                </div>
                                {selectedUserType === 'admin' ? (
                                    <AddNewAdmin
                                        setIsCreateDialogOpen={setIsCreateDialogOpen}
                                        departments={departments}
                                        processing={processing}
                                        post={post}
                                        setData={setData}
                                        data={data}
                                        errors={errors as { first_name: string; last_name: string; middle_name: string; suffix: string; gender: string; department_id: string; position: string; email: string; }}
                                        reset={reset}
                                    />
                                ) : (
                                    <AddNewUser
                                        setIsCreateDialogOpen={setIsCreateDialogOpen}
                                        departments={departmentsForUserCreation}
                                        processing={processing}
                                        post={post}
                                        setData={setData}
                                        data={data}
                                        errors={errors as { first_name: string; last_name: string; middle_name: string; suffix: string; gender: string; department_id: string; position: string; email: string; }}
                                        reset={reset}
                                    />
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>

                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.filter((user) =>
                                user.first_name.toLowerCase().includes(filter.toLowerCase()) ||
                                user.last_name.toLowerCase().includes(filter.toLowerCase()) ||
                                user.middle_name?.toLowerCase().includes(filter.toLowerCase()) ||
                                user.position.toLowerCase().includes(filter.toLowerCase()) ||
                                user.department?.name?.toLowerCase().includes(filter.toLowerCase()) ||
                                user.email.toLowerCase().includes(filter.toLowerCase())
                            ).map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{getFullName(user)}</TableCell>
                                    <TableCell>{user.position}</TableCell>
                                    <TableCell>{user.department?.name || 'N/A'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="capitalize">{user.role}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </TableCell>
                                    <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewAdmin(user)}
                                                title="View Admin Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditAdmin(user)}
                                                title="Edit Admin"
                                                disabled={user.id === auth.user.id}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handlePasswordChange(user)}
                                                title="Change Password"
                                            >
                                                <Key className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleToggleStatus(user)}
                                                title={user.is_active ? 'Deactivate Admin' : 'Activate Admin'}
                                                disabled={!user.is_active && user.id === auth.user.id}
                                            >
                                                {user.is_active ? (
                                                    <Lock className="h-4 w-4" />
                                                ) : (
                                                    <Unlock className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteAdmin(user)}
                                                title="Delete Admin"
                                                disabled={user.id === auth.user.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Admin Details Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>User Details</DialogTitle>
                            <DialogDescription>Complete profile information for the selected user.</DialogDescription>
                        </DialogHeader>
                        {selectedAdmin && (
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {selectedAdmin.role}
                                    </Badge>
                                    <Badge variant={selectedAdmin.is_active ? 'default' : 'secondary'}>
                                        {selectedAdmin.is_active ? 'Active' : 'Inactive'}
                                    </Badge>
                                    <Badge variant="outline" className="capitalize">
                                        {selectedAdmin.gender}
                                    </Badge>
                                </div>
                                <dl className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">First Name</Label>
                                        <p className="text-sm font-medium text-foreground">{selectedAdmin.first_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Last Name</Label>
                                        <p className="text-sm font-medium text-foreground">{selectedAdmin.last_name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Middle Name</Label>
                                        <p className="text-sm text-muted-foreground">{selectedAdmin.middle_name || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Suffix</Label>
                                        <p className="text-sm text-muted-foreground">{selectedAdmin.suffix || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs uppercase text-muted-foreground">Department</Label>
                                        <p className="text-sm font-medium text-foreground">{selectedAdmin.department?.name || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs uppercase text-muted-foreground">Position</Label>
                                        <p className="text-sm text-muted-foreground">{selectedAdmin.position}</p>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs uppercase text-muted-foreground">Email</Label>
                                        <p className="text-sm font-mono text-foreground">{selectedAdmin.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Created At</Label>
                                        <p className="text-sm text-muted-foreground">{format(new Date(selectedAdmin.created_at), 'MMMM d, yyyy h:mm a')}</p>
                                    </div>
                                </dl>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit Admin Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-bold text-gray-900 dark:text-white">Edit Admin</DialogTitle>
                        </DialogHeader>
                        {selectedAdmin && (
                            <EditAdmin
                                admin={selectedAdmin}
                                departments={departments}
                                setIsEditDialogOpen={setIsEditDialogOpen}
                                processing={processing}
                                put={put}
                                setData={setData}
                                data={data}
                                errors={errors as { first_name: string; last_name: string; middle_name: string; suffix: string; gender: string; department_id: string; position: string; email: string; new_password: string; confirm_password: string; }}
                                reset={reset}
                            />
                        )}
                    </DialogContent>
                </Dialog>

                {/* Password Change Dialog */}
                <Dialog open={isPasswordChangeDialogOpen} onOpenChange={setIsPasswordChangeDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-bold text-gray-900 dark:text-white">Change Password for {selectedAdmin ? getFullName(selectedAdmin) : ''}</DialogTitle>
                        </DialogHeader>
                        {selectedAdmin && (
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="new_password">New Password</Label>
                                    <Input
                                        id="new_password"
                                        type="password"
                                        value={data.new_password}
                                        onChange={(e) => setData('new_password', e.target.value)}
                                        placeholder="Enter new password"
                                        className="mt-1"
                                    />
                                    {errors.new_password && (
                                        <p className="text-sm text-red-600 mt-1">{errors.new_password}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="confirm_password">Confirm Password</Label>
                                    <Input
                                        id="confirm_password"
                                        type="password"
                                        value={data.confirm_password}
                                        onChange={(e) => setData('confirm_password', e.target.value)}
                                        placeholder="Confirm new password"
                                        className="mt-1"
                                    />
                                    {errors.confirm_password && (
                                        <p className="text-sm text-red-600 mt-1">{errors.confirm_password}</p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsPasswordChangeDialogOpen(false);
                                            setData('new_password', '');
                                            setData('confirm_password', '');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handlePasswordChangeSubmit}
                                        disabled={processing || !data.new_password || !data.confirm_password}
                                    >
                                        Change Password
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
