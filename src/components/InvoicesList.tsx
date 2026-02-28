import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, Trash2, Edit2, ChevronLeft, ChevronRight, Eye, FileText, CheckCircle2, Clock, X } from 'lucide-react';
import { collection, onSnapshot, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { Link } from 'react-router-dom';

interface Invoice {
    id: string;
    invoiceId: string;
    projectName: string;
    clientDetail: string;
    issueDate: string;
    dueDate: string;
    amountDue: number;
    amountPaid?: number;
    paymentStatus?: 'Paid' | 'Pending' | 'Partial';
    status: 'Paid' | 'Pending' | 'Overdue' | 'Draft';
    createdAt: string;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const InvoicesList: React.FC = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [clientFilter, setClientFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState(''); // YYYY-MM
    const [showFilters, setShowFilters] = useState(false);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const itemsPerPage = 7;

    // Advanced Filtering Logic
    const filteredInvoices = invoices.filter(invoice => {
        // Search Term Filter
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm ||
            invoice.invoiceId.toLowerCase().includes(searchLower) ||
            invoice.clientDetail.toLowerCase().includes(searchLower) ||
            invoice.projectName.toLowerCase().includes(searchLower) ||
            (invoice.amountDue || 0).toString().includes(searchTerm);

        // Status Filter
        const currentStatus = invoice.paymentStatus || invoice.status;
        const matchesStatus = statusFilter === 'All' || currentStatus === statusFilter;

        // Client Filter
        const matchesClient = clientFilter === 'All' || invoice.clientDetail === clientFilter;

        // Date Filter (Matching YYYY-MM)
        const matchesDate = !dateFilter || invoice.issueDate.startsWith(dateFilter);

        return matchesSearch && matchesStatus && matchesClient && matchesDate;
    });

    const sortedInvoices = [...filteredInvoices].sort((a, b) => {
        // Sort by issue date descending (newest first)
        return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
    });

    const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + itemsPerPage);

    // Get unique clients for filter dropdown
    const uniqueClients = Array.from(new Set(invoices.map(inv => inv.clientDetail))).sort();

    // KPI Calculations (based on filtered results)
    const stats = filteredInvoices.reduce((acc, inv) => {
        const invoiced = inv.amountDue || 0;
        const paid = inv.amountPaid || 0;
        const pending = invoiced - paid;

        return {
            totalInvoiced: acc.totalInvoiced + invoiced,
            totalPaid: acc.totalPaid + paid,
            totalPending: acc.totalPending + pending
        };
    }, { totalInvoiced: 0, totalPaid: 0, totalPending: 0 });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const unsubscribe = onSnapshot(query(collection(db, 'invoices'), where('userId', '==', user.uid)), (snapshot) => {
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
            case 'Partial':
                return 'bg-blue-50 text-blue-700 ring-blue-600/20';
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            Invoices
                        </h1>
                        <p className="text-slate-500 text-base">
                            Manage and track all generated invoices.
                        </p>
                    </div>
                    <Link to="/invoices/new" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <Plus className="w-5 h-5" />
                        New Invoice
                    </Link>
                </div>

                {/* KPI Statistics Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Total Invoiced Card */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                            <FileText className="w-32 h-32 text-blue-900" />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <FileText className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalInvoiced)}</span>
                        </div>
                    </div>

                    {/* Total Paid Card */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-32 h-32 text-emerald-900" />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Paid</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalPaid)}</span>
                        </div>
                    </div>

                    {/* Total Pending Card */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform">
                            <Clock className="w-32 h-32 text-amber-900" />
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Pending</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-slate-900">{formatCurrency(stats.totalPending)}</span>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="relative w-full md:w-80">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search invoices, clients, or projects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all ${showFilters || statusFilter !== 'All' || clientFilter !== 'All' || dateFilter
                                    ? 'bg-blue-50 text-blue-600 border-blue-200 border'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <Filter className="w-4 h-4" />
                                Filters {(statusFilter !== 'All' || clientFilter !== 'All' || dateFilter) && `(Active)`}
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 text-slate-700 shadow-sm transition-all active:scale-95">
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                        </div>
                    </div>

                    {/* Expandable Filter Panel */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Client</label>
                                <select
                                    value={clientFilter}
                                    onChange={(e) => setClientFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    <option value="All">All Clients</option>
                                    {uniqueClients.map(client => (
                                        <option key={client} value={client}>{client}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Issue Date (Month)</label>
                                <input
                                    type="month"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setStatusFilter('All');
                                        setClientFilter('All');
                                        setDateFilter('');
                                        setSearchTerm('');
                                    }}
                                    className="w-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-300 rounded-lg hover:border-red-200 hover:bg-red-50"
                                >
                                    <X className="w-4 h-4" />
                                    Clear All
                                </button>
                            </div>
                        </div>
                    )}
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
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${getStatusStyle(invoice.paymentStatus || invoice.status)}`}>
                                                        {invoice.paymentStatus || invoice.status}
                                                    </span>
                                                    {invoice.paymentStatus === 'Partial' && (
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            Bal: ${((invoice.amountDue || 0) - (invoice.amountPaid || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </span>
                                                    )}
                                                </div>
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
