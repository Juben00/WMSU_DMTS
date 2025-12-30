import React from "react"
import { useState, useEffect } from "react"
import Navbar from "@/components/User/navbar"
import DocumentTable from "@/components/User/document-table"
import { Link, router, useForm } from "@inertiajs/react"
import {
    Search,
    FileSearch,
    Filter,
    BarChart3,
    FileText,
    Plus,
    Users,
    Calendar,
    Archive,
    AlertTriangle,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Swal from "sweetalert2"
import TabHeader from "@/components/User/tab-header"
import Spinner from "@/components/spinner"
import ReceiveDocument from "@/components/User/receive-document"
import BarcodeComponent from "@/components/barcode"
import { User } from "@/types"

// Utility function to detect if dark mode is currently active
const isDarkMode = () => {
    return document.documentElement.classList.contains('dark')
}

interface Document {
    id: number
    subject: string
    document_type: "special_order" | "order" | "memorandum" | "for_info" | "letters" | "email" | "travel_order" | "city_resolution" | "invitations" | "vouchers" | "diploma" | "checks" | "job_orders" | "contract_of_service" | "pr" | "other"
    status: string
    created_at: string
    owner_id: number
    barcode_value?: string
    order_number?: string
    files?: { id: number }[]
    recipient_status?: string
    sequence?: number
    user_id?: number
    department_id?: number
    received_at?: string
    is_overstayed?: boolean
    days_overstayed?: number
}

interface Props {
    documents: Document[]
    receivedDocuments?: Document[]
    auth: {
        user: {
            id: number
        }
    }
    document_data?: {
        id: number
        subject: string
        order_number: string
        barcode_value: string
        barcode_path: string
        barcode_svg_url: string
    }
}

const Documents = ({ documents = [], receivedDocuments = [], auth, document_data }: Props) => {
    // Ensure documents is always an array to prevent TypeError
    const documentsArray = Array.isArray(documents) ? documents : [];
    const receivedDocumentsArray = Array.isArray(receivedDocuments) ? receivedDocuments : [];

    // Debug logging
    console.log('Documents Debug Info:', {
        documents: documentsArray,
        receivedDocuments: receivedDocumentsArray,
        documentsType: typeof documents,
        receivedDocumentsType: typeof receivedDocuments,
        authUser: auth.user
    });

    // Merge documents and receivedDocuments, removing duplicates by id
    const allDocuments = [...documentsArray, ...receivedDocumentsArray]
        .filter((doc, index, self) => index === self.findIndex(d => d.id === doc.id));

    const [activeTab, setActiveTab] = useState("received")
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [documentTypeFilter, setDocumentTypeFilter] = useState("all")
    const [sortBy, setSortBy] = useState("latest")
    const [fiscalYearFilter, setFiscalYearFilter] = useState("all")
    const [archivedFilter, setArchivedFilter] = useState("all")
    const [overstayedFilter, setOverstayedFilter] = useState("all")
    const [showBarcodeModal, setShowBarcodeModal] = useState(false)
    const [documentDataShown, setDocumentDataShown] = useState(false)

    const { data, setData, post, processing, reset } = useForm({
        barcode_value: ''
    })

    // Show barcode modal when document_data is available (after successful document creation)
    useEffect(() => {
        if (document_data?.barcode_svg_url && !documentDataShown) {
            setDocumentDataShown(true);
            Swal.fire({
                icon: 'success',
                title: 'Document Sent Successfully!',
                html: `
                    <div class="text-center ">
                        <!-- Document Details Card -->
                        <div class="max-w-md mx-auto bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20 rounded-xl p-5 mb-6 border border-red-200 dark:border-red-800">
                            <div class="flex items-center gap-2 mb-4">
                                <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                <h4 class="font-semibold text-red-800 dark:text-red-200">Document Information</h4>
                            </div>

                            <div class="grid  grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z"></path>
                                    </svg>
                                    <div class="flex-1 text-left">
                                        <span class="font-medium text-gray-700 dark:text-gray-300">Subject:</span>
                                        <p class="text-gray-900 dark:text-gray-100 font-semibold">${document_data.subject}</p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                                    <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                                    </svg>
                                    <div class="flex-1 text-left">
                                        <span class="font-medium text-gray-700 dark:text-gray-300">Order Number:</span>
                                        <p class="text-gray-900 dark:text-gray-100 font-mono font-bold">${document_data.order_number}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Barcode Container -->
                        <div id="barcode-container" class="mb-2"></div>
                    </div>
                `,
                confirmButtonColor: '#b91c1c',
                confirmButtonText: 'Close',
                width: '500px',
                customClass: {
                    popup: isDarkMode() ? 'swal-dark text-left' : 'text-left'
                },
                background: isDarkMode() ? '#1f2937' : '#ffffff',
                color: isDarkMode() ? '#f9fafb' : '#111827',
                didOpen: () => {
                    // Render the React barcode component after the modal opens
                    const container = document.getElementById('barcode-container');
                    if (container) {
                        import('react-dom/client').then(({ createRoot }) => {
                            const root = createRoot(container);
                            root.render(
                                React.createElement(BarcodeComponent, {
                                    barcode_path: document_data.barcode_path,
                                    barcode_value: document_data.barcode_value,
                                    className: "mx-auto"
                                })
                            );
                        });
                    }
                }
            }).then(() => {
                // Modal closed - no need to reload since we're tracking with state
                // The document_data will be cleared on next page load by backend
            });
        }
    }, [document_data, documentDataShown])

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        post(route('users.documents.confirm-receive'), {
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Document Received',
                    text: 'Document successfully marked as received.',
                    confirmButtonColor: '#b91c1c',
                    background: isDarkMode() ? '#1f2937' : '#ffffff',
                    color: isDarkMode() ? '#f9fafb' : '#111827',
                    customClass: {
                        popup: isDarkMode() ? 'swal-dark' : ''
                    }
                }).then(() => {
                    setShowBarcodeModal(false)
                    reset()
                    setActiveTab("received")
                })
            },
            onError: (errors: { [key: string]: string }) => {
                const errorMessages = Object.values(errors).join('\n');
                Swal.fire({
                    icon: 'error',
                    title: 'Document Not Found',
                    text: errorMessages || 'Invalid barcode. Document not found.',
                    confirmButtonColor: '#b91c1c',
                    background: isDarkMode() ? '#1f2937' : '#ffffff',
                    color: isDarkMode() ? '#f9fafb' : '#111827',
                    customClass: {
                        popup: isDarkMode() ? 'swal-dark' : ''
                    }
                })
            }
        })
    }


    const getCurrentFiscalYear = () => {
        const now = new Date()
        return now.getFullYear()
    }

    const getFiscalYear = (date: string) => {
        return new Date(date).getFullYear()
    }

    const getAvailableFiscalYears = () => {
        const years = new Set<number>()
        allDocuments.forEach((doc) => {
            years.add(getFiscalYear(doc.created_at))
        })
        return Array.from(years).sort((a, b) => b - a)
    }

    const isInCurrentFiscalYear = (date: string) => {
        const docYear = getFiscalYear(date)
        const currentYear = getCurrentFiscalYear()
        return docYear === currentYear
    }

    // Helper function to determine if the current user/department is the latest recipient (approval chain)
    const isDocumentReceivedByUser = (doc: Document) => {
        const userId = auth.user.id;
        const departmentId = (auth.user as User).department?.id;
        if (doc.document_type === "for_info") {
            // For for_info, anyone in the department can receive at any time if they are a recipient
            return (
                (doc.user_id && doc.user_id === userId) ||
                (doc.department_id && doc.department_id === departmentId)
            );
        }
        // For other types, allow department-wide visibility:
        // Users in the same department can see documents sent to their department
        return (
            (doc.user_id && doc.user_id === userId) ||
            (doc.department_id && doc.department_id === departmentId)
        );
    };

    // Helper function to determine if a document was sent by the current user (owner), but is NOT currently with them
    const isDocumentSentByUser = (doc: Document) => {
        const userId = auth.user.id;
        const departmentId = (auth.user as User).department?.id;
        const isOwner = doc.owner_id === userId;
        const isWithUser = (doc.user_id && doc.user_id === userId) || (doc.department_id && doc.department_id === departmentId);
        return isOwner && !isWithUser && doc.status !== "draft";
    };

    // Group by document_id and get the record with the max sequence (for non-for_info), or all for_info docs
    const getLatestDocumentRecords = (docs: Document[]) => {
        const map = new Map<number, Document>();
        // Safety check: ensure docs is an array
        if (!Array.isArray(docs)) {
            return [];
        }
        docs.forEach(doc => {
            if (doc.document_type === "for_info") {
                // For for_info, just keep the latest (or any, since all can receive)
                if (!map.has(doc.id)) {
                    map.set(doc.id, doc);
                }
            } else {
                const currentDoc = map.get(doc.id);
                const docSequence = 'sequence' in doc ? (doc as { sequence?: number }).sequence : undefined;
                const currentSequence = currentDoc && 'sequence' in currentDoc ? (currentDoc as { sequence?: number }).sequence : undefined;
                if (!map.has(doc.id) || (docSequence !== undefined && currentSequence !== undefined && docSequence > currentSequence)) {
                    map.set(doc.id, doc);
                }
            }
        });
        return Array.from(map.values());
    };

    const latestDocs = getLatestDocumentRecords(allDocuments);

    // Helper to check if a for_info document is received by the current user's department
    const isForInfoReceivedByDepartment = (doc: Document) => {
        if (doc.document_type !== "for_info") return false;
        const departmentId = (auth.user as User).department?.id;
        // If recipients are present, check them
        const docWithRecipients = doc as Document & { recipients?: Array<{ department_id?: number; status?: string }> };
        if (docWithRecipients.recipients) {
            return docWithRecipients.recipients.some(
                (rec) => rec.department_id === departmentId && rec.status === "received"
            );
        }
        // fallback: check doc.department_id and recipient_status
        // Allow department-wide visibility: if document is sent to the department, all users can see it
        return doc.department_id === departmentId && doc.recipient_status === "received";
    };

    // Received: documents where the current user/department is the latest recipient AND the latest recipient's status is 'received'
    // BUT exclude documents where the current user is the owner (those should be in sent)
    const received = latestDocs.filter(
        (doc) => {
            const isCurrentFiscalYearDoc = isInCurrentFiscalYear(doc.created_at);
            const isNotOwnerOrReturned = (doc.owner_id !== auth.user.id || doc.status === "returned");
            const isForInfoReceived = (doc.document_type === "for_info" && isForInfoReceivedByDepartment(doc));
            const isNonForInfoReceived = (doc.document_type !== "for_info" && isDocumentReceivedByUser(doc) && (doc.recipient_status === "received" || doc.recipient_status === "approved" || doc.recipient_status === "rejected"));

            const shouldInclude = isCurrentFiscalYearDoc && isNotOwnerOrReturned && (isForInfoReceived || isNonForInfoReceived);

            // Debug logging for received documents filtering
            console.log(`Document ${doc.id} (${doc.subject}) filtering:`, {
                isCurrentFiscalYearDoc,
                isNotOwnerOrReturned,
                isForInfoReceived,
                isNonForInfoReceived,
                shouldInclude,
                document_type: doc.document_type,
                recipient_status: doc.recipient_status,
                owner_id: doc.owner_id,
                current_user_id: auth.user.id,
                department_id: doc.department_id,
                user_department_id: (auth.user as User).department?.id
            });

            return shouldInclude;
        }
    );

    // Sent: documents where the user is the owner and they are not in received list
    const sent = latestDocs.filter((doc) =>
        isInCurrentFiscalYear(doc.created_at) &&
        doc.owner_id === auth.user.id && // User is the owner
        !received.some(r => r.id === doc.id) // Not already in received
        && doc.recipient_status !== "returned"
    );

    const published = allDocuments.filter((doc) => {
        const docWithPublic = doc as Document & { is_public?: boolean };
        return doc.owner_id === auth.user.id && docWithPublic.is_public;
    })

    // Archived documents are those not in the current fiscal year
    const archived = allDocuments.filter((doc) => !isInCurrentFiscalYear(doc.created_at))

    const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case "approved":
                return "default"
            case "pending":
                return "secondary"
            case "rejected":
                return "destructive"
            case "returned":
                return "outline"
            case "in_review":
                return "secondary"
            default:
                return "outline"
        }
    }

    const getDocumentTypeVariant = (documentType: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (documentType) {
            case "special_order":
                return "secondary"
            case "order":
                return "default"
            case "memorandum":
                return "outline"
            case "for_info":
                return "secondary"
            default:
                return "outline"
        }
    }

    const getDocumentTypeDisplayName = (documentType: string) => {
        switch (documentType) {
            case "special_order":
                return "Special Order"
            case "order":
                return "Order"
            case "memorandum":
                return "Memorandum"
            case "for_info":
                return "For Info"
            case "letters":
                return "Letters"
            case "email":
                return "Email"
            case "travel_order":
                return "Travel Order"
            case "city_resolution":
                return "City Resolution"
            case "invitations":
                return "Invitations"
            case "vouchers":
                return "Vouchers"
            case "diploma":
                return "Diploma"
            case "checks":
                return "Checks"
            case "job_orders":
                return "Job Orders"
            case "contract_of_service":
                return "Contract of Service"
            case "pr":
                return "PR"
            default:
                return "Unknown"
        }
    }

    const filterDocs = (docs: Document[]) => {
        let filtered = docs

        // Filter by search
        if (search.trim()) {
            filtered = filtered.filter(
                (doc) =>
                    doc.subject.toLowerCase().includes(search.toLowerCase()) ||
                    doc.id.toString().includes(search) ||
                    (doc.barcode_value && doc.barcode_value.toLowerCase().includes(search.toLowerCase())) ||
                    (doc.order_number && doc.order_number.toLowerCase().includes(search.toLowerCase())),
            )
        }

        // Filter by status
        if (statusFilter !== "all") {
            filtered = filtered.filter((doc) => doc.status === statusFilter)
        }

        // Filter by document type
        if (documentTypeFilter !== "all") {
            filtered = filtered.filter((doc) => doc.document_type === documentTypeFilter)
        }

        // Filter by fiscal year (only for archived tab)
        if (activeTab === "archived" && fiscalYearFilter !== "all") {
            filtered = filtered.filter((doc) => getFiscalYear(doc.created_at).toString() === fiscalYearFilter)
        }

        // Filter by archived type (only for archived tab)
        if (activeTab === "archived" && archivedFilter !== "all") {
            if (archivedFilter === "sent") {
                filtered = filtered.filter((doc) => isDocumentSentByUser(doc))
            } else if (archivedFilter === "received") {
                filtered = filtered.filter((doc) => isDocumentReceivedByUser(doc))
            }
        }

        // Filter by overstayed status (only for received tab)
        if (activeTab === "received" && overstayedFilter !== "all") {
            if (overstayedFilter === "overstayed") {
                filtered = filtered.filter((doc) => doc.is_overstayed === true)
            } else if (overstayedFilter === "not_overstayed") {
                filtered = filtered.filter((doc) => doc.is_overstayed !== true)
            }
        }

        // Sort by overstayed status first, then by date
        filtered.sort((a, b) => {
            // First, prioritize overstayed documents
            if (a.is_overstayed && !b.is_overstayed) return -1
            if (!a.is_overstayed && b.is_overstayed) return 1

            // If both are overstayed, sort by days overstayed (most overstayed first)
            if (a.is_overstayed && b.is_overstayed) {
                return (b.days_overstayed || 0) - (a.days_overstayed || 0)
            }

            // Then sort by date
            const dateA = new Date(a.created_at).getTime()
            const dateB = new Date(b.created_at).getTime()
            return sortBy === "latest" ? dateB - dateA : dateA - dateB
        })

        return filtered
    }

    const renderDocuments = (docs: Document[]) => {
        const filtered = filterDocs(docs)

        return (
            <DocumentTable
                documents={filtered}
                activeTab={activeTab}
                getStatusVariant={getStatusVariant}
                getDocumentTypeVariant={getDocumentTypeVariant}
                getDocumentTypeDisplayName={getDocumentTypeDisplayName}
                getFiscalYear={getFiscalYear}
            />
        )
    }

    // Count overstayed documents
    const overstayedCount = received.filter(doc => doc.is_overstayed && doc.recipient_status === 'received').length

    const tabConfig = [
        {
            id: "received",
            label: "Received",
            icon: Users,
            count: received.length,
            overstayedCount: overstayedCount
        },
        { id: "sent", label: "Sent", icon: FileText, count: sent.length },
        { id: "archived", label: "Archived", icon: Archive, count: archived.length },
    ]

    return (
        <>
            {processing && <Spinner />}
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Barcode Modal */}
                    {showBarcodeModal && (
                        <ReceiveDocument
                            setShowBarcodeModal={setShowBarcodeModal}
                            handleSubmit={handleSubmit}
                            data={data}
                            processing={processing}
                            setData={setData}
                        />
                    )}

                    {/* Enhanced Header Section */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                            <TabHeader title="Documents" description="Manage and track your documents efficiently" />
                            <div className="flex items-center gap-4">
                                {/* Barcode Confirmation Section */}
                                <div className="flex justify-end">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="border-red-600 cursor-pointer text-red-700 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-900 dark:hover:text-white dark:bg-gray-800"
                                        onClick={() => {
                                            setShowBarcodeModal(true)
                                        }}
                                    >
                                        <BarChart3 className="w-5 h-5 mr-1" />
                                        Receive Document
                                    </Button>
                                </div>
                                <Link href="/documents/create">
                                    <Button
                                        size="lg"
                                        className="bg-gradient-to-r from-red-600 to-red-700 cursor-pointer hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all duration-200 dark:text-white"
                                    >
                                        <Plus className="w-5 h-5 mr-1" />
                                        New Document
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Enhanced Tabs */}
                    <Card className="mb-8 border-2 shadow-lg bg-white dark:bg-gray-800 dark:to-gray-900">
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 ">
                                {tabConfig.map((tab) => {
                                    const Icon = tab.icon
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`bg-white  flex justify-center cursor-pointer items-center dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${activeTab === tab.id
                                                ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg"
                                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                            <Badge variant={activeTab === tab.id ? "secondary" : "outline"} className="ml-1">
                                                {tab.count}
                                            </Badge>
                                        </button>
                                    )
                                })}
                                <Link
                                    href="/published-documents"
                                    className={`bg-white flex justify-center items-center dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${typeof window !== "undefined" && window.location.pathname === "/published-documents"
                                        ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg"
                                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                                        }`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Published
                                    <Badge variant="outline" className="ml-1">
                                        {published.length}
                                    </Badge>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Enhanced Search and Filter Section */}
                    <Card className="mb-8 border-2 shadow-lg  bg-white dark:bg-gray-800 dark:to-gray-900">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                                    <Search className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Search & Filter</h2>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {/* Search Input */}
                                <div className="lg:col-span-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                                        <Input
                                            type="text"
                                            className="bg-white dark:bg-gray-800 pl-10 h-12 border-slate-200 dark:border-slate-700 focus:ring-red-500 focus:border-red-500"
                                            placeholder="Search by subject, ID, order number, or barcode..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Status Filter */}
                                <div className="bg-white dark:bg-gray-800 h-12 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="bg-white dark:bg-gray-800 h-12 border-none">
                                            <Filter className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="returned">Returned</SelectItem>
                                            <SelectItem value="in_review">In Review</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Document Type Filter */}
                                <div className="bg-white dark:bg-gray-800 h-12 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                                    <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
                                        <SelectTrigger className="bg-white dark:bg-gray-800 h-12 border-none" >
                                            <FileSearch className="w-4 h-4 mr-2" />
                                            <SelectValue placeholder="All Types" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Types</SelectItem>
                                            <SelectItem value="special_order">Special Order</SelectItem>
                                            <SelectItem value="order">Order</SelectItem>
                                            <SelectItem value="memorandum">Memorandum</SelectItem>
                                            <SelectItem value="for_info">For Info</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Fiscal Year Filter - Only show for archived tab */}
                                {activeTab === "archived" && (
                                    <div className="bg-white dark:bg-gray-800 h-12 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                                        <Select value={fiscalYearFilter} onValueChange={setFiscalYearFilter}>
                                            <SelectTrigger className="bg-white dark:bg-gray-800 h-12 border-none">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                <SelectValue placeholder="All Years" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Years</SelectItem>
                                                {getAvailableFiscalYears().map((year) => (
                                                    <SelectItem key={year} value={year.toString()}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Archived Type Filter - Only show for archived tab */}
                                {activeTab === "archived" && (
                                    <div className="bg-white dark:bg-gray-800 h-12 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 rounded-lg">

                                        <Select value={archivedFilter} onValueChange={setArchivedFilter}>
                                            <SelectTrigger className="bg-white dark:bg-gray-800 h-12 border-none">
                                                <Archive className="w-4 h-4 mr-2" />
                                                <SelectValue placeholder="All Types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="sent">Sent</SelectItem>
                                                <SelectItem value="received">Received</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Overstayed Filter - Only show for received tab */}
                                <div className="gap-4 bg-white dark:bg-gray-800 h-12 flex items-center justify-center border-2 ps-4 border-gray-200 dark:border-gray-700 rounded-lg w-fit">
                                    {activeTab === "received" && (
                                        <Select value={overstayedFilter} onValueChange={setOverstayedFilter}>
                                            <SelectTrigger className="bg-white dark:bg-gray-800 w-48 border-none">
                                                <AlertTriangle className="w-4 h-4 mr-2" />
                                                <SelectValue placeholder="All Documents" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Documents</SelectItem>
                                                <SelectItem value="overstayed">Overstayed</SelectItem>
                                                <SelectItem value="not_overstayed">Not Overstayed</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sort</span>
                                        <Select value={sortBy} onValueChange={setSortBy}>
                                            <SelectTrigger className="bg-white dark:bg-gray-800 w-48 border-none">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="latest">Latest First</SelectItem>
                                                <SelectItem value="oldest">Oldest First</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Sort Options */}

                        </CardContent>
                    </Card>

                    {/* Enhanced Documents Grid */}
                    <Card className="border-2 shadow-lg bg-white dark:bg-gray-800 dark:to-gray-900">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {activeTab === "received"
                                        ? "Received Documents"
                                        : activeTab === "sent"
                                            ? "Sent Documents"
                                            : activeTab === "archived"
                                                ? "Archived Documents"
                                                : "Published Documents"}
                                </h2>
                                {activeTab === "received" && overstayedCount > 0 && (
                                    <div className="ml-auto">
                                        <Badge variant="destructive" className="text-sm">
                                            <AlertTriangle className="w-4 h-4 mr-1" />
                                            {overstayedCount} document{overstayedCount !== 1 ? 's' : ''} overstayed
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {activeTab === "received" && renderDocuments(received)}
                            {activeTab === "sent" && renderDocuments(sent)}
                            {activeTab === "archived" && renderDocuments(archived)}
                            {activeTab === "published" && renderDocuments(published)}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    )
}

export default Documents
