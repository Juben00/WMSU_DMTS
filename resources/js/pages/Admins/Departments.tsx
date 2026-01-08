import { Head, } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Plus, Trash2, Pencil, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EditDepartment from '@/components/Departments/EditDepartment';
import type { Departments } from '@/types';
import AddDepartment from '@/components/Departments/AddDepartment';
import Swal from 'sweetalert2';
import Spinner from '@/components/spinner';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Departments',
        href: '/departments',
    },
];

interface Props {
    departments: Departments[];
    filters: {
        name: string;
        code: string;
        description: string;
        type: string;
        is_presidential: boolean;
    };
}

export default function Departments({ departments, filters }: Props) {
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedOffice, setSelectedOffice] = useState<Departments | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [filter, setFilter] = useState(filters.name || '');

    const { processing, delete: destroy, data, setData, post, errors, reset, put } = useForm({
        name: filters.name || '',
        code: filters.code || '',
        description: filters.description || '',
        type: filters.type || '',
        is_presidential: filters.is_presidential ? 'true' : 'false',
    });

    const handleDeleteOffice = (department: Departments) => {
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
                destroy(route('departments.destroy', department.id), {
                    onSuccess: () => {
                        toast.success('Department deleted successfully');
                    },
                    onError: (errors: { [key: string]: string }) => {
                        toast.error(Object.values(errors).join('\n') || 'Failed to delete department. Please try again.');
                    }
                });
            }
        });
    };

    const handleViewOffice = (department: Departments) => {
        setSelectedOffice(department);
        setIsViewDialogOpen(true);
    };

    const handleEditOffice = (department: Departments) => {
        setSelectedOffice(department);
        // Initialize form data with the selected department's data
        setData('name', department.name || '');
        setData('code', department.code || '');
        setData('description', department.description || '');
        setData('type', department.type as 'office' | 'college'); // Assert type
        setData('is_presidential', department.is_presidential ? 'true' : 'false');
        setIsEditDialogOpen(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            {processing && <Spinner />}
            <Head title="Departments Management" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
                <div className="flex gap-6 overflow-auto items-center w-full">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Departments Management</h1>
                            <p className="text-muted-foreground">
                                Manage all departments
                            </p>
                        </div>
                    </div>

                    {/* filter section */}
                    <div className="flex items-center gap-2 flex-1">
                        <p className="text-sm font-semibold dark:text-white">Search:</p>
                        <Input type="text" placeholder="Search Department" onChange={(e) => setFilter(e.target.value)} value={filter} />
                    </div>

                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Department
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Department</DialogTitle>
                            </DialogHeader>
                            <AddDepartment setIsCreateDialogOpen={setIsCreateDialogOpen} processing={processing} post={post} setData={setData} data={data as unknown as { name: string; code: string; description: string; type: string; is_presidential: string }} errors={errors as unknown as { name: string; code: string; description: string; type: string; is_presidential: string }} reset={reset as () => void} />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Is Presidential</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {departments.filter((department: Departments) =>
                                department.name.toLowerCase().includes(filter.toLowerCase()) ||
                                department.code.toLowerCase().includes(filter.toLowerCase()) ||
                                department.description?.toLowerCase().includes(filter.toLowerCase()) ||
                                department.type.toLowerCase().includes(filter.toLowerCase())
                            ).map((department: Departments) => (
                                <TableRow key={department.id}>
                                    <TableCell>{department.name}</TableCell>
                                    <TableCell>{department.code}</TableCell>
                                    <TableCell>{department.description}</TableCell>
                                    <TableCell className="capitalize">{department.type}</TableCell>
                                    <TableCell>{department.is_presidential ? 'Yes' : 'No'}</TableCell>
                                    <TableCell>{format(new Date(department.created_at), 'MMM d, yyyy')}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleViewOffice(department)}
                                                title="View Department Details"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditOffice(department)}
                                                title="Edit Department"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteOffice(department)}
                                                title="Delete Department"
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

                {/* View Office Dialog */}
                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Department Details</DialogTitle>
                            <DialogDescription>Quick snapshot of the selected department.</DialogDescription>
                        </DialogHeader>
                        {selectedOffice && (
                            <div className="space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline" className="capitalize">
                                        {selectedOffice.type}
                                    </Badge>
                                    <Badge variant={selectedOffice.is_presidential ? 'default' : 'secondary'}>
                                        {selectedOffice.is_presidential ? 'Presidential' : 'Non-presidential'}
                                    </Badge>
                                </div>
                                <dl className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs uppercase text-muted-foreground">Department Name</Label>
                                        <p className="text-sm font-medium text-foreground">{selectedOffice.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Department Code</Label>
                                        <p className="text-sm font-medium tracking-wide text-foreground">{selectedOffice.code}</p>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs uppercase text-muted-foreground">Description</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {selectedOffice.description || 'No description provided.'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs uppercase text-muted-foreground">Created At</Label>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(selectedOffice.created_at), 'MMMM d, yyyy h:mm a')}
                                        </p>
                                    </div>
                                </dl>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Edit Office Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Department</DialogTitle>
                        </DialogHeader>
                        {selectedOffice && (
                            <EditDepartment
                                department={selectedOffice}
                                setIsEditDialogOpen={setIsEditDialogOpen}
                                processing={processing}
                                put={put}
                                setData={setData}
                                data={data}
                                errors={errors as { name: string; code: string; description: string; type: string; is_presidential: string }}
                                reset={reset as () => void}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
