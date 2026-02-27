import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, Trash2, Edit2, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Link } from 'react-router-dom';

interface Invoice {
    id: string;
    invoiceId: string;
    projectName: string;
    clientDetail: string;
    issueDate: string;
    dueDate: string;
    amountDue: number;
    status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
    createdAt: string;
}

const InvoicesList: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const itemsPerPage = 7;
    const sortedInvoices = [...invoices].sort((a, b) => {
        // Sort by issue date descending (newest first)
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
    });

    const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'invoices'), (snapshot) => {
            const invoicesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Invoice[];
            setInvoices(invoicesData);
        });
        return () => unsubscribe();
    }, []);

    const confirmDelete = (id: string) => {
        setInvoiceToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!invoiceToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'invoices', invoiceToDelete));
            setIsDeleteModalOpen(false);
            setInvoiceToDelete(null);
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("Failed to delete invoice.");
        } finally {
            setIsDeleting(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Paid':
                return 'bg-green-50 text-green-700 ring-green-600/20';
            case 'Pending':
                return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20';
            case 'Overdue':
                return 'bg-red-50 text-red-700 ring-red-600/20';
            default:
                return 'bg-slate-50 text-slate-700 ring-slate-600/20';
        }
    };

    return (
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:ml-64">
            <div className="flex flex-col gap-8">

                {/* Header Section */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoices</h1>
                        <p className="text-slate-500 text-base">
                            Manage and track all generated invoices.
                        </p>
                    </div>
                    <Link to="/invoices/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <Plus className="w-5 h-5" />
                        New Invoice
                    </Link>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search invoices..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm transition-colors">
                            <Filter className="w-4 h-4" />
                            Filter
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700 shadow-sm transition-colors">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Invoice ID</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Date / Due Date</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-slate-500 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                            No invoices found. Click "New Invoice" to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-slate-900">
                                                {invoice.invoiceId}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900">{invoice.clientDetail || 'Unknown'}</span>
                                                    <span className="text-xs text-slate-500">{invoice.projectName || 'No Project'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-900">{invoice.issueDate}</span>
                                                    <span className="text-xs text-slate-500">Due: {invoice.dueDate}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-900 font-medium">
                                                ${(invoice.amountDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(invoice.status)}`}>
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link to={`/invoices/view/${invoice.id}`} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="View">
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link to={`/invoices/edit/${invoice.id}`} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                                                        <Edit2 className="w-4 h-4" />
                                                    </Link>
                                                    <button onClick={() => confirmDelete(invoice.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 gap-4">
                            <p className="text-sm text-slate-500">
                                Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to <span className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, sortedInvoices.length)}</span> of <span className="font-medium text-slate-900">{sortedInvoices.length}</span> results
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="flex w-9 h-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`text-sm flex w-9 h-9 items-center justify-center rounded-lg transition-colors ${currentPage === page
                                            ? 'font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                            : 'font-medium hover:bg-slate-200 text-slate-700'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="flex w-9 h-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden text-slate-900">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Delete Invoice?</h2>
                            <p className="text-slate-500 mb-6">
                                Are you sure you want to delete this invoice? This action cannot be undone.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-4 py-2 w-full border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="px-4 py-2 w-full bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default InvoicesList;
