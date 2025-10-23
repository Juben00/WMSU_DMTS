import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, FileText, Image as ImageIcon } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import { usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

interface RejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentId: number;
}

interface FormData {
    status: string;
    comments: string;
    attachment_files: File[];
    forward_to_id: number | null;
    [key: string]: any;
}

interface FileWithPreview {
    file: File;
    preview?: string;
    id: string;
}

interface PageProps {
    auth: {
        user: {
            role: string;
        };
    };
    [key: string]: any;
}

const RejectModal: React.FC<RejectModalProps> = ({ isOpen, onClose, documentId }) => {
    const [comments, setComments] = useState('');
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const { auth } = usePage<PageProps>().props;

    const { post, processing, setData, reset } = useForm<FormData>({
        status: 'rejected',
        comments: '',
        attachment_files: [],
        forward_to_id: null,
    });

    // Update form data whenever state changes
    useEffect(() => {
        setData({
            status: 'rejected',
            comments: comments,
            attachment_files: files.map(f => f.file),
            forward_to_id: null,
        });
    }, [comments, files, setData, auth.user.role]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files) as File[];
            const filesWithPreviews: FileWithPreview[] = newFiles.map(file => {
                const fileWithPreview: FileWithPreview = {
                    file,
                    id: Math.random().toString(36).substr(2, 9)
                };

                // Create preview for image files
                if (file.type.startsWith('image/')) {
                    fileWithPreview.preview = URL.createObjectURL(file);
                }

                return fileWithPreview;
            });

            setFiles(prevFiles => [...prevFiles, ...filesWithPreviews]);
        }
    };

    const removeFile = (id: string) => {
        setFiles(prevFiles => {
            const fileToRemove = prevFiles.find(f => f.id === id);
            if (fileToRemove?.preview) {
                URL.revokeObjectURL(fileToRemove.preview);
            }
            return prevFiles.filter(f => f.id !== id);
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const isImageFile = (file: File) => {
        return file.type.startsWith('image/');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent multiple submissions
        if (processing) {
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to reject this document?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
        }).then((result) => {
            if (result.isConfirmed) {
                post(route('documents.respond', documentId), {
                    preserveScroll: true,
                    forceFormData: true,
                    onSuccess: () => {
                        onClose();
                        reset();
                        setComments('');
                        // Clean up preview URLs
                        files.forEach(fileWithPreview => {
                            if (fileWithPreview.preview) {
                                URL.revokeObjectURL(fileWithPreview.preview);
                            }
                        });
                        setFiles([]);
                        Swal.fire({
                            icon: 'success',
                            title: 'Document rejected successfully',
                            timer: 1500,
                            showConfirmButton: false
                        });
                    },
                    onError: (errors: any) => {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errors.message || 'An error occurred while rejecting the document',
                        });
                    }
                });
            }
        });
    };

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            reset();
            setComments('');
            // Clean up preview URLs
            files.forEach(fileWithPreview => {
                if (fileWithPreview.preview) {
                    URL.revokeObjectURL(fileWithPreview.preview);
                }
            });
            setFiles([]);
        }
    }, [isOpen, reset]);

    // Cleanup preview URLs when component unmounts
    useEffect(() => {
        return () => {
            files.forEach(fileWithPreview => {
                if (fileWithPreview.preview) {
                    URL.revokeObjectURL(fileWithPreview.preview);
                }
            });
        };
    }, []);

    return (
        <Dialog
            open={isOpen}
            onClose={() => {
                onClose();
                setComments('');
                // Clean up preview URLs
                files.forEach(fileWithPreview => {
                    if (fileWithPreview.preview) {
                        URL.revokeObjectURL(fileWithPreview.preview);
                    }
                });
                setFiles([]);
            }}
            className="relative z-50"
        >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md rounded bg-white dark:bg-gray-900 p-6 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
                    <Dialog.Title className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Document Rejection Form</Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label className="dark:text-gray-200">Comments</Label>
                            <Textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className="mt-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                                rows={3}
                                placeholder="Please provide a reason for rejection..."
                            />
                        </div>

                        <div>
                            <Label className="dark:text-gray-200">Response Attachments (Optional)</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">These files will be added as response attachments to the document.</p>
                            <Input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                                onChange={handleFileChange}
                                className="cursor-pointer dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 file:dark:bg-gray-700 file:dark:text-gray-100 file:dark:border-gray-600"
                            />

                            {files.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Files:</h4>
                                    {files.map((fileWithPreview) => (
                                        <div key={fileWithPreview.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <div className="flex-shrink-0">
                                                {isImageFile(fileWithPreview.file) ? (
                                                    <ImageIcon className="h-8 w-8 text-blue-500" />
                                                ) : (
                                                    <FileText className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                                                        {fileWithPreview.file.name}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeFile(fileWithPreview.id)}
                                                        className="ml-2 h-6 w-6 p-0 dark:text-gray-400 dark:hover:text-gray-200"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatFileSize(fileWithPreview.file.size)}
                                                </p>

                                                {/* Image Preview */}
                                                {fileWithPreview.preview && (
                                                    <div className="mt-2">
                                                        <img
                                                            src={fileWithPreview.preview}
                                                            alt={fileWithPreview.file.name}
                                                            className="max-w-full h-32 object-cover rounded border border-gray-200 dark:border-gray-600"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    onClose();
                                    setComments('');
                                    // Clean up preview URLs
                                    files.forEach(fileWithPreview => {
                                        if (fileWithPreview.preview) {
                                            URL.revokeObjectURL(fileWithPreview.preview);
                                        }
                                    });
                                    setFiles([]);
                                }}
                                className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                            >
                                {processing ? 'Processing...' : 'Reject'}
                            </Button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default RejectModal;
