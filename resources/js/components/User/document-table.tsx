import React from "react"
import { Link } from "@inertiajs/react"
import {
    Eye,
    Download,
    FileCheck2,
    Clock,
    XCircle,
    Undo2,
    BarChart3,
    FileText,
    Hash,
    AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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

interface DocumentTableProps {
    documents: Document[]
    activeTab: string
    getStatusVariant: (status: string) => "default" | "secondary" | "destructive" | "outline"
    getDocumentTypeVariant: (documentType: string) => "default" | "secondary" | "destructive" | "outline"
    getDocumentTypeDisplayName: (documentType: string) => string
    getFiscalYear: (date: string) => number
}

const statusIcons: Record<string, React.ReactNode> = {
    approved: <FileCheck2 className="w-4 h-4 text-white" />,
    pending: <Clock className="w-4 h-4 text-white" />,
    rejected: <XCircle className="w-4 h-4 text-white" />,
    returned: <Undo2 className="w-4 h-4 text-white" />,
    in_review: <Clock className="w-4 h-4 text-white" />,
}


const DocumentTable: React.FC<DocumentTableProps> = ({
    documents,
    activeTab,
    getStatusVariant,
    getDocumentTypeVariant,
    getDocumentTypeDisplayName,
    getFiscalYear
}) => {
    if (documents.length === 0) {
        return (
            <div className="col-span-full flex flex-col items-center justify-center py-16 px-4">
                <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <FileText className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No documents found</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
                    Try adjusting your search terms or filter criteria to find the documents you're looking for.
                </p>
            </div>
        )
    }

    console.log(documents);

    return (
        <div className="overflow-x-auto">
            <Table className="w-full">
                <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800">
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Document</TableHead>
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Barcode</TableHead>
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Type</TableHead>
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Status</TableHead>
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Overstayed</TableHead>
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Date</TableHead>
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Files</TableHead>
                        {activeTab === "archived" && (
                            <TableHead className="font-semibold text-slate-900 dark:text-white">Fiscal Year</TableHead>
                        )}
                        <TableHead className="font-semibold text-slate-900 dark:text-white">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {documents.map((doc) => (
                        <TableRow
                            key={doc.id}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${doc.is_overstayed && doc.recipient_status === 'received'
                                ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500'
                                : ''
                                }`}
                        >
                            <TableCell className="py-4">
                                <div className="space-y-1">
                                    <h4 className="font-medium text-slate-900 dark:text-white line-clamp-2">
                                        {doc.subject}
                                    </h4>
                                    <div className="flex flex-col gap-1 text-sm text-slate-500 dark:text-slate-400">
                                        {doc.order_number && (
                                            <div className="flex items-center gap-1">
                                                <Hash className="w-3 h-3" />
                                                <span className="font-mono">{doc.order_number}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="py-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                        <BarChart3 className="w-3 h-3" />
                                        <span className="font-mono">{doc.barcode_value}</span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getDocumentTypeVariant(doc.document_type)} className="text-xs">
                                    {getDocumentTypeDisplayName(doc.document_type)}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(doc.status)} className="text-xs">
                                    <span className="mr-1">{statusIcons[doc.status]}</span>
                                    {doc.status.charAt(0).toUpperCase() + doc.status.slice(1).replace("_", " ")}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                {doc.is_overstayed && doc.document_type !== 'for_info' && doc.recipient_status === 'received' ? (
                                    <Badge variant="destructive" className="text-xs">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        {Math.floor(doc.days_overstayed || 0)} day{Math.floor(doc.days_overstayed || 0) !== 1 ? 's' : ''} overstayed
                                    </Badge>
                                ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                {new Date(doc.created_at).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                })}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                {doc.files && doc.files.length > 0 ? (
                                    <div className="flex items-center gap-1">
                                        <Download className="w-4 h-4" />
                                        <span>{doc.files.length} file{doc.files.length !== 1 ? "s" : ""}</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400">No files</span>
                                )}
                            </TableCell>
                            {activeTab === "archived" && (
                                <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                        FY {getFiscalYear(doc.created_at)}
                                    </Badge>
                                </TableCell>
                            )}
                            <TableCell>
                                <Link href={`/documents/${doc.id}`}>
                                    <Button size="sm" className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white">
                                        <Eye className="w-4 h-4" />
                                        View
                                    </Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default DocumentTable
