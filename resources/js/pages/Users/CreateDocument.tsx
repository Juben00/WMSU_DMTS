import React, { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '@/components/User/navbar';
import { useForm, router } from '@inertiajs/react';
import axios from '@/lib/axios';
import { Departments, User } from '@/types';
import { useCsrfToken } from '@/hooks/use-csrf-token';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import Swal from 'sweetalert2';
import { FileText, FileCheck, Users, Building, Upload, ArrowLeft, RefreshCw, Star, ClipboardList, Megaphone, Info, CheckCircle, AlertCircle, Clock, Mail, Plane, MapPin, PartyPopper, Receipt, GraduationCap, CreditCard, Briefcase, FileSignature, FolderOpen, Calendar, ShoppingCart, File } from 'lucide-react';
import Spinner from '@/components/spinner';
import { AxiosError } from 'axios';

type FormData = {
    subject: string;
    order_number: string;
    document_type: 'special_order' | 'order' | 'memorandum' | 'for_info' | 'letters' | 'email' | 'travel_order' | 'city_resolution' | 'invitations' | 'vouchers' | 'diploma' | 'checks' | 'job_orders' | 'contract_of_service' | 'pr' | 'appointment' | 'purchase_order' | 'other';
    description: string;
    files: File[];
    status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'returned';
    recipient_ids: number[]; // department IDs
    initial_recipient_id: number | null; // department ID
    through_department_ids: number[]; // department IDs for through
    auto_generate_order_number: boolean;
    signatory: string;
    request_from: string;
    request_from_department: string;
}

interface Props {
    auth: {
        user: User;
    };
    departments: Array<{
        id: number;
        name: string;
        is_presidential: boolean;
    }>;
}



const CreateDocument = ({ auth, departments }: Props) => {
    // Ensure CSRF token is available
    const csrfToken = useCsrfToken();

    const fileObjectUrls = useRef<string[]>([]);
    const [filePreviews, setFilePreviews] = useState<Array<{ type: 'image' | 'file', value: string, name: string }>>([]);
    const [sendToId, setSendToId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [isGeneratingOrderNumber, setIsGeneratingOrderNumber] = useState(false);
    const { data, setData, processing, errors } = useForm<FormData>({
        subject: '',
        order_number: '',
        document_type: 'special_order',
        description: '',
        files: [],
        status: 'pending',
        recipient_ids: [],
        initial_recipient_id: null,
        through_department_ids: [],
        auto_generate_order_number: false,
        signatory: '',
        request_from: '',
        request_from_department: '',
    });

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const generateOrderNumberTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isGeneratingRef = useRef(false);
    const isPresidentDepartment = auth.user.department?.is_presidential || false;

    // Upload limits (keep in sync with backend validation: max:51200 = 50MB per file)
    const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB per file
    const MAX_TOTAL_UPLOAD_BYTES = 50 * 1024 * 1024 * 1024; // 1GB total per request
    // Allowlisted extensions/MIME types; keep in sync with backend mimes
    const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png'];
    const ALLOWED_MIMES_PREFIX = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'image/jpeg',
        'image/png',
    ];

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
        return `${value} ${sizes[i]}`;
    };


    // Function to generate auto order number with robust CSRF handling
    const generateOrderNumber = useCallback(async (retryCount = 0) => {
        if (isGeneratingRef.current) {
            console.warn("Order number generation already in progress");
            return;
        }

        isGeneratingRef.current = true;
        setIsGeneratingOrderNumber(true);

        try {

            // Wait for CSRF token to be available on first attempt
            if (retryCount === 0 && !csrfToken) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const response = await axios.post(
                route("users.documents.generate-order-number"),
                {}
            );

            if (response.data?.order_number) {
                setData("order_number", response.data.order_number);

                // Reset generation state immediately on success
                isGeneratingRef.current = false;
                setIsGeneratingOrderNumber(false);
                return;
            } else {
                throw new Error("No order number received from server");
            }

        } catch (error: unknown) {
            const errorResponse = error as AxiosError;
            const status = errorResponse.response?.status;
            console.error(`Error generating order number (attempt ${retryCount + 1}):`, (errorResponse.response?.data as { error: string })?.error as string || errorResponse.message as string);

            // Handle CSRF 419 errors with automatic retry
            if (status === 419 && retryCount < 3) {

                // Try to refresh CSRF token first
                try {
                    await axios.get(route("users.refresh-csrf"));
                } catch (refreshError) {
                    console.warn("Failed to refresh CSRF token:", refreshError);
                }

                // Retry after delay (don't reset generation state yet)
                setTimeout(() => {
                    generateOrderNumber(retryCount + 1);
                }, (retryCount + 1) * 1000);
                return;
            }

            // Show user-friendly error only after all retries failed
            if (status === 419) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Session Issue',
                    text: 'Your session has expired. Please refresh the page and try again.',
                    confirmButtonColor: '#b91c1c',
                    showCancelButton: true,
                    confirmButtonText: 'Refresh Page',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.reload();
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error Generating Order Number',
                    text: (errorResponse.response?.data as { error: string })?.error as string || errorResponse.message as string || 'Failed to generate order number. Please try again.',
                    confirmButtonColor: '#b91c1c',
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.reload();
                    }
                });
            }

            // Reset flags after error handling
            isGeneratingRef.current = false;
            setIsGeneratingOrderNumber(false);
        }
    }, [csrfToken, setData]);

    // Auto-generate order number when auto-generate is enabled
    useEffect(() => {
        if (data.auto_generate_order_number && csrfToken) {
            // Clear existing timeout
            if (generateOrderNumberTimeoutRef.current) {
                clearTimeout(generateOrderNumberTimeoutRef.current);
            }

            // Set new timeout
            generateOrderNumberTimeoutRef.current = setTimeout(() => {
                generateOrderNumber();
            }, 500);
        }

        // Cleanup timeout on unmount or dependency change
        return () => {
            if (generateOrderNumberTimeoutRef.current) {
                clearTimeout(generateOrderNumberTimeoutRef.current);
            }
        };
    }, [data.auto_generate_order_number, csrfToken, generateOrderNumber]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent double submission
        if (isSubmitting || processing) {
            return;
        }

        // Validate required fields
        if (!data.subject || !data.document_type || !data.description) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Required Fields',
                text: 'Please fill out all required fields.',
                confirmButtonColor: '#b91c1c',
            });
            return;
        }

        // Validate order number if not auto-generating
        if (!data.auto_generate_order_number && !data.order_number) {
            Swal.fire({
                icon: 'warning',
                title: 'Order Number Required',
                text: 'Please enter an order number or enable auto-generation.',
                confirmButtonColor: '#b91c1c',
            });
            return;
        }

        // Validate file types/sizes before submit to avoid 413 (Payload Too Large) and unsafe uploads
        if (data.files && data.files.length > 0) {
            // Type allowlist check
            const disallowed = data.files
                .map((f) => {
                    const ext = f.name.split('.').pop()?.toLowerCase() || '';
                    const mime = f.type;
                    const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
                    const mimeAllowed = mime ? ALLOWED_MIMES_PREFIX.some((allowed) => mime === allowed) : extAllowed; // fallback to ext
                    return { f, ext, mime, ok: extAllowed && mimeAllowed };
                })
                .filter(({ ok }) => !ok);
            if (disallowed.length > 0) {
                const list = disallowed.map(({ f }) => f.name).join(', ');
                Swal.fire({
                    icon: 'error',
                    title: 'Unsupported File Type',
                    html: `Only these file types are allowed: <br/><b>${ALLOWED_EXTENSIONS.join(', ')}</b><br/>Blocked: ${list}`,
                    confirmButtonColor: '#b91c1c',
                });
                return;
            }

            // Per-file check
            const tooLargeFiles = data.files
                .map((f, idx) => ({ f, idx }))
                .filter(({ f }) => f.size > MAX_FILE_SIZE_BYTES);
            if (tooLargeFiles.length > 0) {
                const list = tooLargeFiles
                    .map(({ f }) => `${f.name} (${formatBytes(f.size)})`)
                    .join(', ');
                Swal.fire({
                    icon: 'error',
                    title: 'File Too Large',
                    text: `Each file must be ≤ ${formatBytes(MAX_FILE_SIZE_BYTES)}. Oversized: ${list}`,
                    confirmButtonColor: '#b91c1c',
                });
                return;
            }

            // Total payload check
            const totalBytes = data.files.reduce((sum, f) => sum + f.size, 0);
            if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
                Swal.fire({
                    icon: 'error',
                    title: 'Total Upload Too Large',
                    text: `Selected files total ${formatBytes(totalBytes)}, which exceeds the limit of ${formatBytes(MAX_TOTAL_UPLOAD_BYTES)}. Please remove some files or compress them.`,
                    confirmButtonColor: '#b91c1c',
                });
                return;
            }
        }

        setIsSubmitting(true);

        // For 'for_info', must have at least one recipient
        if (data.document_type === 'for_info') {
            if (data.recipient_ids.length === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Departments Selected',
                    text: 'Please select at least one department.',
                    confirmButtonColor: '#b91c1c',
                });
                setIsSubmitting(false);
                return;
            }
        } else {
            // For other types, must have a main recipient
            if (!sendToId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'No Main Department Selected',
                    text: 'Please select the main department (Send To).',
                    confirmButtonColor: '#b91c1c',
                });
                setIsSubmitting(false);
                return;
            }

            // Check if through departments include the main recipient
            if (data.through_department_ids.includes(sendToId)) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Invalid Selection',
                    text: 'The main department cannot be selected as a through department.',
                    confirmButtonColor: '#b91c1c',
                });
                setIsSubmitting(false);
                return;
            }
        }

        // Always use FormData for submission
        const formData = new FormData();
        formData.append('subject', data.subject);
        formData.append('document_type', data.document_type);
        formData.append('description', data.description);
        formData.append('status', 'pending');
        formData.append('order_number', data.order_number);


        // Add president-specific fields if user is from president's department
        if (isPresidentDepartment) {
            if (data.signatory) {
                formData.append('signatory', data.signatory);
            }
            if (data.request_from) {
                formData.append('request_from', data.request_from);
            }
            if (data.request_from_department) {
                formData.append('request_from_department', data.request_from_department);
            }
        }

        // Recipients
        if (data.document_type === 'for_info') {
            data.recipient_ids.forEach((id, idx) => {
                formData.append(`recipient_ids[${idx}]`, id.toString());
            });
            // Set initial_recipient_id if available
            if (data.initial_recipient_id) {
                formData.append('initial_recipient_id', data.initial_recipient_id.toString());
            }
        } else {
            // Only one recipient for these types
            formData.append('recipient_ids[0]', sendToId!.toString());
            if (data.through_department_ids.length > 0) {
                formData.append('initial_recipient_id', data.through_department_ids[0].toString());
                // Add all through department IDs to the form data
                data.through_department_ids.forEach((id, idx) => {
                    formData.append(`through_department_ids[${idx}]`, id.toString());
                });
            }
        }

        // Files (only append if files exist)
        if (data.files.length > 0) {
            data.files.forEach((file, idx) => {
                formData.append(`files[${idx}]`, file);
            });
        }

        router.post(route('users.documents.send'), formData, {
            forceFormData: true,
            onSuccess: () => {
                setIsSubmitting(false);
                // Simply redirect to documents page - the barcode will be shown there via session data
                // window.location.href = route('users.documents');
            },
            onError: (errors) => {
                console.error('Document submission errors:', errors);
                setIsSubmitting(false);

                let errorMessage = 'Failed to submit document. Please try again.';

                // Handle specific error types
                if (errors.order_number) {
                    errorMessage = errors.order_number;
                } else if (errors.subject) {
                    errorMessage = errors.subject;
                } else if (errors.document_type) {
                    errorMessage = errors.document_type;
                } else if (errors.description) {
                    errorMessage = errors.description;
                } else if (errors.files) {
                    errorMessage = errors.files;
                } else if (errors.recipient_ids) {
                    errorMessage = errors.recipient_ids;
                } else if (errors.message) {
                    errorMessage = errors.message;
                }

                Swal.fire({
                    icon: 'error',
                    title: 'Failed to Submit Document',
                    text: errorMessage,
                    confirmButtonColor: '#b91c1c',
                });
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
        let files: File[] = [];
        if ('dataTransfer' in e) {
            e.preventDefault();
            files = Array.from(e.dataTransfer.files);
        } else if (e.target.files) {
            files = Array.from(e.target.files);
        }
        if (files.length > 0) {
            // Clean up old object URLs
            fileObjectUrls.current.forEach(url => URL.revokeObjectURL(url));
            fileObjectUrls.current = [];
            // Enforce per-file and total limits proactively on selection
            const validFiles: File[] = [];
            let runningTotal = 0;
            const rejected: string[] = [];
            files.forEach((file) => {
                const ext = file.name.split('.').pop()?.toLowerCase() || '';
                const mime = file.type;
                const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
                const mimeAllowed = mime ? ALLOWED_MIMES_PREFIX.some((allowed) => mime === allowed) : extAllowed;
                if (!extAllowed || !mimeAllowed) {
                    rejected.push(`${file.name} (unsupported type)`);
                    return;
                }
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    rejected.push(`${file.name} (${formatBytes(file.size)})`);
                    return;
                }
                if (runningTotal + file.size > MAX_TOTAL_UPLOAD_BYTES) {
                    rejected.push(`${file.name} (${formatBytes(file.size)})`);
                    return;
                }
                runningTotal += file.size;
                validFiles.push(file);
            });
            if (rejected.length > 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Some files were skipped',
                    html: `The following exceeded the limits and were not added: <br/>${rejected.join('<br/>')}`,
                    confirmButtonColor: '#b91c1c',
                });
            }
            setData('files', validFiles);
            // Only create previews for images
            const previews = validFiles.map((file): { type: 'image' | 'file', value: string, name: string } => {
                if (file.type.startsWith('image/')) {
                    const url = URL.createObjectURL(file);
                    fileObjectUrls.current.push(url);
                    return { type: 'image', value: url, name: file.name };
                }
                return { type: 'file', value: '', name: file.name };
            });
            setFilePreviews(previews);
        }
        setIsDragActive(false);
    };

    // Handle removal of a selected file
    const handleRemoveFile = (index: number) => {
        const newFiles = data.files.filter((_, i) => i !== index);
        setData('files', newFiles);
        // Clean up and regenerate previews
        if (filePreviews[index] && filePreviews[index].type === 'image') {
            URL.revokeObjectURL(filePreviews[index].value);
        }
        // Regenerate previews for remaining files
        const previews = newFiles.map((file): { type: 'image' | 'file', value: string, name: string } => {
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                fileObjectUrls.current.push(url);
                return { type: 'image', value: url, name: file.name };
            }
            return { type: 'file', value: '', name: file.name };
        });
        setFilePreviews(previews);
        // If no files left, clear the file input value
        if (newFiles.length === 0 && fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Cleanup preview URLs when component unmounts
    React.useEffect(() => {
        return () => {
            fileObjectUrls.current.forEach(url => URL.revokeObjectURL(url));
            fileObjectUrls.current = [];
        };
    }, []);

    // Build recipient options from departments (not users)
    const recipientOptions = departments.map((department) => ({
        value: department.id,
        label: department.name,
    }));


    const baseDocumentTypeOptions = [
        {
            value: 'special_order',
            label: 'Special Order',
            icon: Star,
            description: 'Official directives with special significance',
            color: 'from-yellow-500 to-orange-500'
        },
        {
            value: 'order',
            label: 'Order',
            icon: ClipboardList,
            description: 'Standard administrative orders',
            color: 'from-blue-500 to-indigo-500'
        },
        {
            value: 'memorandum',
            label: 'Memorandum',
            icon: Megaphone,
            description: 'Internal communications and announcements',
            color: 'from-purple-500 to-pink-500'
        },
        {
            value: 'for_info',
            label: 'For Info',
            icon: Info,
            description: 'Informational documents for awareness',
            color: 'from-green-500 to-emerald-500'
        },
    ];

    const presidentialDocumentTypeOptions = [
        {
            value: 'letters',
            label: 'Letters',
            icon: FileText,
            description: 'Official correspondence and letters',
            color: 'from-slate-500 to-gray-500'
        },
        {
            value: 'email',
            label: 'Email',
            icon: Mail,
            description: 'Email communications and mailing',
            color: 'from-cyan-500 to-blue-500'
        },
        {
            value: 'travel_order',
            label: 'Travel Order',
            icon: Plane,
            description: 'Travel authorizations and orders',
            color: 'from-sky-500 to-blue-500'
        },
        {
            value: 'city_resolution',
            label: 'City Resolution',
            icon: MapPin,
            description: 'City resolutions and ordinances',
            color: 'from-emerald-500 to-green-500'
        },
        {
            value: 'invitations',
            label: 'Invitations',
            icon: PartyPopper,
            description: 'Event invitations and announcements',
            color: 'from-pink-500 to-rose-500'
        },
        {
            value: 'vouchers',
            label: 'Vouchers',
            icon: Receipt,
            description: 'Payment vouchers from payroll',
            color: 'from-orange-500 to-amber-500'
        },
        {
            value: 'diploma',
            label: 'Diploma',
            icon: GraduationCap,
            description: 'Academic certificates and diplomas',
            color: 'from-indigo-500 to-purple-500'
        },
        {
            value: 'checks',
            label: 'Checks',
            icon: CreditCard,
            description: 'Payment checks and financial documents',
            color: 'from-green-500 to-teal-500'
        },
        {
            value: 'job_orders',
            label: 'Job Orders',
            icon: Briefcase,
            description: 'Job orders and contracts',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            value: 'contract_of_service',
            label: 'Contract of Service',
            icon: FileSignature,
            description: 'Service contracts and agreements',
            color: 'from-purple-500 to-violet-500'
        },
        {
            value: 'pr',
            label: 'PR',
            icon: FolderOpen,
            description: 'Purchase Request',
            color: 'from-red-500 to-pink-500'
        },
        {
            value: 'appointment',
            label: 'Appointment',
            icon: Calendar,
            description: 'Appointment documents',
            color: 'from-green-500 to-teal-500'
        },
        {
            value: 'purchase_order',
            label: 'Purchase Order',
            icon: ShoppingCart,
            description: 'Purchase order documents',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            value: 'other',
            label: 'Other',
            icon: File,
            description: 'Other documents',
            color: 'from-gray-500 to-slate-500'
        }
    ];

    const documentTypeOptions = isPresidentDepartment
        ? [...baseDocumentTypeOptions, ...presidentialDocumentTypeOptions]
        : baseDocumentTypeOptions;


    return (
        <>
            {(isSubmitting || processing) && <Spinner />}
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                                    <FileText className="w-8 h-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Document</h1>
                                    <p className="text-gray-600 dark:text-gray-300 mt-1">Fill out the form below to send a new document</p>
                                </div>
                            </div>
                            <button
                                onClick={() => router.visit(route('users.documents'))}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        </div>
                    </div>

                    {/* Document Information Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mb-8 border border-gray-200 dark:border-gray-700">
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                                    <FileCheck className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Document Information</h2>
                            </div>

                            <form id="create-doc-form" onSubmit={handleSubmit} className="space-y-8">
                                {/* Document Type Selection */}
                                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                                        <div>
                                            <label className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                Document Type <span className="text-red-500">*</span>
                                            </label>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose the type of document you want to create</p>
                                        </div>
                                    </div>

                                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${isPresidentDepartment ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-4'}`}>
                                        {documentTypeOptions.map((option) => {
                                            const IconComponent = option.icon;
                                            const isSelected = data.document_type === option.value;

                                            return (
                                                <div
                                                    key={option.value}
                                                    onClick={() => setData('document_type', option.value as FormData['document_type'])}
                                                    className={`
                                                        relative cursor-pointer rounded-xl p-4 border-2 transition-all duration-200 transform hover:scale-105
                                                        ${isSelected
                                                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg'
                                                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md'
                                                        }
                                                    `}
                                                >
                                                    {/* Selection indicator */}
                                                    {isSelected && (
                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    )}

                                                    {/* Icon with gradient background */}
                                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${option.color} flex items-center justify-center mb-3 mx-auto`}>
                                                        <IconComponent className="w-6 h-6 text-white" />
                                                    </div>

                                                    {/* Title */}
                                                    <h3 className={`text-sm font-semibold text-center mb-2 ${isSelected ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'
                                                        }`}>
                                                        {option.label}
                                                    </h3>

                                                    {/* Description */}
                                                    <p className={`text-xs text-center leading-relaxed ${isSelected ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                        {option.description}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {errors.document_type && <div className="text-red-500 text-xs mt-3">{errors.document_type}</div>}
                                </div>

                                {/* Order Number */}
                                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                                        <div>
                                            <label htmlFor="order_number" className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                Order Number <span className="text-red-500">*</span>
                                            </label>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter manually or let the system generate automatically</p>
                                        </div>
                                    </div>

                                    {/* Order number input with side-by-side controls */}
                                    <div className="flex md:flex-row flex-col gap-3 items-start">
                                        {/* Input field container */}
                                        <div className="lg:flex w-full relative">
                                            <Input
                                                type="text"
                                                name="order_number"
                                                id="order_number"
                                                required
                                                placeholder={data.auto_generate_order_number ? (isGeneratingOrderNumber ? "Generating..." : "Auto-generated") : "e.g. 2024-00123"}
                                                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                value={data.order_number}
                                                onChange={e => setData('order_number', e.target.value)}
                                                disabled={data.auto_generate_order_number}
                                            />
                                            {data.auto_generate_order_number && (
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                    <RefreshCw className={`h-4 w-4 text-gray-400 ${isGeneratingOrderNumber ? 'animate-spin' : ''}`} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Radio controls container */}
                                        <div className="flex flex-col flex-1 dark:border-gray-600 md:flex-row w-full md:items-center gap-4 bg-white dark:bg-gray-800 rounded-lg px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    id="manual_order"
                                                    name="order_generation"
                                                    checked={!data.auto_generate_order_number}
                                                    onChange={() => {
                                                        setData('auto_generate_order_number', false);
                                                        setData('order_number', '');
                                                    }}
                                                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <label htmlFor="manual_order" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    Manual Input
                                                </label>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    id="auto_order"
                                                    name="order_generation"
                                                    checked={data.auto_generate_order_number}
                                                    onChange={() => {
                                                        setData('auto_generate_order_number', true);
                                                        // Clear existing timeout and generate immediately
                                                        if (generateOrderNumberTimeoutRef.current) {
                                                            clearTimeout(generateOrderNumberTimeoutRef.current);
                                                        }
                                                        generateOrderNumber();
                                                    }}
                                                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                />
                                                <label htmlFor="auto_order" className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    Auto-Generate
                                                </label>
                                            </div>

                                            {data.auto_generate_order_number && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // Clear existing timeout and generate immediately
                                                        if (generateOrderNumberTimeoutRef.current) {
                                                            clearTimeout(generateOrderNumberTimeoutRef.current);
                                                        }
                                                        generateOrderNumber();
                                                    }}
                                                    disabled={isGeneratingOrderNumber}
                                                    className="flex items-center gap-1  px-2 p-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed md:ml-2"
                                                >
                                                    <RefreshCw className={`h-3 w-3 ${isGeneratingOrderNumber ? 'animate-spin' : ''}`} />
                                                    {isGeneratingOrderNumber ? 'Generating...' : 'Refresh'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {errors.order_number && <div className="text-red-500 text-xs mt-1">{errors.order_number}</div>}

                                    {data.auto_generate_order_number && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
                                            <div className="flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-blue-700 dark:text-blue-300">
                                                        {isGeneratingOrderNumber ? 'Generating order number...' : 'Auto-generation enabled'}
                                                    </span>
                                                    <p className="text-blue-600 dark:text-blue-400 mt-0.5">
                                                        {isGeneratingOrderNumber
                                                            ? 'Please wait while we generate your order number.'
                                                            : `Order number will be automatically generated based on your department and the current fiscal year.`
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {!data.auto_generate_order_number && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                                            <div className="flex items-start gap-2">
                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full mt-1.5 flex-shrink-0"></div>
                                                <div>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">Manual input enabled</span>
                                                    <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                                                        Please enter your order number manually. Make sure it follows your department's numbering convention.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Subject */}
                                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                                        <div>
                                            <label htmlFor="subject" className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                Subject <span className="text-red-500">*</span>
                                            </label>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Brief, descriptive title for your document</p>
                                        </div>
                                    </div>
                                    <Input
                                        type="text"
                                        name="subject"
                                        id="subject"
                                        required
                                        placeholder="Enter document subject"
                                        className="mt-2 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        value={data.subject}
                                        onChange={e => setData('subject', e.target.value)}
                                    />
                                    {errors.subject && <div className="text-red-500 text-xs mt-1">{errors.subject}</div>}
                                </div>

                                {/* Description */}
                                <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                                        <div>
                                            <label htmlFor="description" className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                Description <span className="text-red-500">*</span>
                                            </label>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detailed explanation of the document's purpose and content</p>
                                        </div>
                                    </div>
                                    <Textarea
                                        name="description"
                                        id="description"
                                        rows={4}
                                        placeholder="Describe the document's purpose, details, or instructions"
                                        className="mt-2 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                    />
                                    {errors.description && <div className="text-red-500 text-xs mt-1">{errors.description}</div>}
                                </div>

                                {isPresidentDepartment && (
                                    <>
                                        {/* Signatory */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                                                <label htmlFor="signatory" className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Signatory </label>
                                                <Input
                                                    type="text"
                                                    name="signatory"
                                                    id="signatory"
                                                    placeholder="Enter signatory"
                                                    className="mt-2 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                    value={data.signatory}
                                                    onChange={e => setData('signatory', e.target.value)}
                                                />
                                            </div>
                                            {/* Request From Department */}
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                                                <label htmlFor="request_from_department" className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Request From Department</label>
                                                <Input
                                                    type="text"
                                                    name="request_from_department"
                                                    id="request_from_department"
                                                    placeholder="Enter request from department"
                                                    className="mt-2 block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                                    value={data.request_from_department}
                                                    onChange={e => setData('request_from_department', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </form>
                        </div>
                    </div>

                    {/* Recipients Section */}
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden mb-10 border border-white/20 dark:border-gray-700/50">
                        <div className="bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-indigo-900/20 px-8 py-6 border-b border-red-100 dark:border-red-800/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recipients</h2>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium mt-1">Step 2 of 4 • Select document recipients</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">

                            {data.document_type === 'for_info' ? (
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                                    <label className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        Send To Department <span className="text-red-500">*</span>
                                    </label>
                                    <MultiSelect
                                        options={recipientOptions}
                                        selected={data.recipient_ids}
                                        onChange={(selected) => {
                                            setData('recipient_ids', selected);
                                            setData('initial_recipient_id', selected[0] ?? null);
                                        }}
                                        placeholder="Select one or more departments"
                                    />
                                    {errors.recipient_ids && (
                                        <div className="text-red-500 text-xs mt-1">{errors.recipient_ids}</div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                                        <label className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                            <Building className="w-4 h-4" />
                                            Send To Department <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            value={sendToId ? sendToId.toString() : ''}
                                            onValueChange={(value) => {
                                                setSendToId(value ? parseInt(value) : null);
                                            }}
                                        >
                                            <SelectTrigger className="mt-2 block w-full rounded-lg border-red-300 dark:border-red-600 shadow-sm focus:border-red-500 focus:ring-2 focus:ring-red-200 transition truncate bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                                <SelectValue placeholder="Select main recipient" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {recipientOptions.map((option) => (
                                                    <SelectItem key={option.value} value={option.value.toString()}>
                                                        <span>{option.label}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {!sendToId && (
                                            <div className="text-red-500 text-xs mt-1">Main department is required.</div>
                                        )}
                                    </div>
                                    {!isPresidentDepartment && (
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
                                            <label className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                                                <Building className="w-4 h-4" />
                                                Send Through Department <span className="text-gray-400 dark:text-gray-500">(optional)</span>
                                            </label>
                                            <MultiSelect
                                                options={recipientOptions}
                                                selected={data.through_department_ids}
                                                onChange={(selected) => {
                                                    setData('through_department_ids', selected);
                                                }}
                                                placeholder="Select optional through departments (optional)"
                                            />
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                                                Document will be sent to the first selected through department, then to the main department.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Files Section */}
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden mb-10 border border-white/20 dark:border-gray-700/50">
                        <div className="bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 px-8 py-6 border-b border-red-100 dark:border-red-800/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Documents</h2>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium mt-1">Step 3 of 4 • Attach your document files</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">

                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                                    <div>
                                        <label htmlFor="files" className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                            <Upload className="w-5 h-5" />
                                            Select Files <span className="text-gray-400 dark:text-gray-500">(optional)</span>
                                        </label>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Upload PDF, Word, Excel, or image files (optional)</p>
                                    </div>
                                </div>

                                <div
                                    className={`relative group transition-all duration-300 ${isDragActive ? 'scale-102' : 'scale-100'}`}
                                    onClick={() => fileInputRef.current?.click()}
                                    tabIndex={0}
                                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                                    role="button"
                                    aria-label="Upload files"
                                    onDrop={handleFileChange}
                                    onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
                                    onDragLeave={e => { e.preventDefault(); setIsDragActive(false); }}
                                >
                                    <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all duration-300 ${isDragActive ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg scale-105' : 'border-red-300 dark:border-red-600 bg-white dark:bg-gray-800 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 hover:shadow-md'}`}>
                                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${isDragActive ? 'bg-red-500 shadow-lg scale-110' : 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800 dark:to-red-700 group-hover:from-red-200 group-hover:to-red-300'}`}>
                                            <Upload className={`w-8 h-8 transition-all duration-300 ${isDragActive ? 'text-white' : 'text-red-600 dark:text-red-300'}`} />
                                        </div>

                                        <div className="text-center">
                                            <h3 className={`text-xl font-bold mb-2 transition-colors ${isDragActive ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {isDragActive ? 'Drop your files here!' : 'Upload your documents'}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                                Drag & drop files here, or <span className="font-semibold text-red-600 dark:text-red-400 underline">browse your computer</span>
                                            </p>

                                            <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">PDF</span>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">DOC</span>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">XLSX</span>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">Images</span>
                                            </div>
                                        </div>

                                        <Input
                                            type="file"
                                            name="files"
                                            id="files"
                                            multiple
                                            ref={fileInputRef}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleFileChange}
                                            tabIndex={-1}
                                            aria-label="Select files to upload"
                                        />
                                    </div>
                                </div>
                                {errors.files && <div className="text-red-500 text-sm mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">{errors.files}</div>}
                            </div>

                            {/* File Previews */}
                            {filePreviews.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        File Previews
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                        {filePreviews.map((preview, index) => (
                                            <div key={index} className="relative group rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:shadow-xl transition-all duration-200 flex flex-col items-center justify-center h-48">
                                                {/* Delete button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="absolute size-6 top-2 right-2 bg-red-600 text-white cursor-pointer rounded-full hover:bg-red-700 transition z-10"
                                                    title="Remove file"
                                                >
                                                    &times;
                                                </button>
                                                {preview.type === 'image' && (
                                                    <img
                                                        src={preview.value}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200"
                                                    />
                                                )}
                                                {preview.type === 'file' && (
                                                    <div className="flex flex-col items-center justify-center h-full w-full">
                                                        <FileText className="w-12 h-12 text-gray-400 mb-2" />
                                                        <span className="text-gray-700 dark:text-gray-200 text-sm text-center px-2 break-all">{preview.name}</span>
                                                    </div>
                                                )}
                                                {preview.type === 'image' && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-4 py-3 text-sm font-medium">
                                                        {preview.name}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions Section */}
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-3xl shadow-xl overflow-hidden mb-10 border border-white/20 dark:border-gray-700/50">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-8 py-6 border-b border-purple-100 dark:border-purple-800/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                                    <FileCheck className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Send Document</h2>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium mt-1">Step 4 of 4 • Review and submit your document</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-8">

                            {/* Summary Card */}
                            <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50 shadow-sm mb-8">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Review Summary</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Double-check your information before Sending</p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className={`w-3 h-3 rounded-full ${data.document_type ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Type</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{data.document_type ? documentTypeOptions.find(opt => opt.value === data.document_type)?.label : 'Not selected'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className={`w-3 h-3 rounded-full ${data.order_number ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Order Number</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{data.order_number || 'Not generated'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className={`w-3 h-3 rounded-full ${data.subject ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subject</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{data.subject || 'Not filled'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className={`w-3 h-3 rounded-full ${data.description ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{data.description ? (data.description.length > 50 ? data.description.substring(0, 50) + '...' : data.description) : 'Not filled'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                                        <div className={`w-3 h-3 rounded-full ${(data.document_type === 'for_info' ? data.recipient_ids.length > 0 : sendToId) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Recipients</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {data.document_type === 'for_info'
                                                    ? `${data.recipient_ids.length} department(s) selected`
                                                    : sendToId
                                                        ? `${departments.find(d => d.id === sendToId)?.name || 'Selected department'}`
                                                        : 'No recipient selected'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-6">
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    disabled={isSubmitting || processing}
                                    className="group cursor-pointer inline-flex items-center justify-center gap-3 px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-base font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                >
                                    <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="create-doc-form"
                                    disabled={isSubmitting || processing}
                                    className="group cursor-pointer inline-flex items-center justify-center gap-3 px-12 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-red-500 via-red-600 to-pink-600 hover:from-red-600 hover:via-red-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800 disabled:opacity-60 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                                    <div className="relative flex items-center gap-3">
                                        {isSubmitting || processing ? (
                                            <>
                                                <Clock className="w-5 h-5 animate-spin" />
                                                <span>Sending Document...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileCheck className="w-5 h-5 transition-transform group-hover:scale-110" />
                                                <span>Send Document</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CreateDocument;
