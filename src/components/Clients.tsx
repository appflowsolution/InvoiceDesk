import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, Edit2, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Client {
    id: string;
    name: string;
    contact?: string;
    address?: string;
    email: string;
    phone?: string;
    projects: number;
    totalBilled: number;
    status: 'Active' | 'Inactive';
    avatarUrl?: string;
    initials?: string;
}

const getInitials = (name: string) => {
    if (!name) return '';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const Clients: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Client | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        address: '',
        email: '',
        phone: '',
        status: 'Active' as 'Active' | 'Inactive'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const itemsPerPage = 7;
    const sortedClients = [...clients].sort((a, b) => a.name.localeCompare(b.name));
    const totalPages = Math.ceil(sortedClients.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedClients = sortedClients.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        const unsubscribeClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Client[];
            setClients(clientsData);
        });

        const unsubscribeInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
            const invoicesData = snapshot.docs.map(doc => doc.data());
            setInvoices(invoicesData);
        });

        return () => {
            unsubscribeClients();
            unsubscribeInvoices();
        };
    }, []);

    const openAddModal = () => {
        setCurrentClient(null);
        setFormData({ name: '', contact: '', address: '', email: '', phone: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (client: Client) => {
        setCurrentClient(client);
        setFormData({
            name: client.name,
            contact: client.contact || '',
            address: client.address || '',
            email: client.email,
            phone: client.phone || '',
            status: client.status
        });
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setClientToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!clientToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'clients', clientToDelete));
            setIsDeleteModalOpen(false);
            setClientToDelete(null);
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("Failed to delete client.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email) return;
        setIsSubmitting(true);

        try {
            if (currentClient) {
                // Update
                const clientRef = doc(db, 'clients', currentClient.id);
                await updateDoc(clientRef, {
                    name: formData.name,
                    contact: formData.contact,
                    address: formData.address,
                    email: formData.email,
                    phone: formData.phone,
                    status: formData.status
                });
            } else {
                // Add
                await addDoc(collection(db, 'clients'), {
                    name: formData.name,
                    contact: formData.contact,
                    address: formData.address,
                    email: formData.email,
                    phone: formData.phone,
                    status: formData.status,
                    projects: 0,
                    totalBilled: 0,
                    initials: getInitials(formData.name),
                    createdAt: serverTimestamp()
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving document: ", error);
            alert("Failed to save client.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="flex-1 w-full max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:ml-64">
            <div className="flex flex-col gap-8">

                {/* Header Section */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clients</h1>
                        <p className="text-slate-500 text-base">
                            Central directory of all your customer relationships and billing history.
                        </p>
                    </div>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <Plus className="w-5 h-5" />
                        New Client
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search clients..."
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
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Client Name</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Email Address</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Projects</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Total Billed</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-slate-500 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedClients.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                            No clients found. Click "New Client" to add one.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedClients.map((client) => {
                                        // Calculate dynamic totals based on invoices
                                        const clientInvoices = invoices.filter(inv => inv.clientDetail === client.name);
                                        const totalBilled = clientInvoices.reduce((sum, inv) => sum + (Number(inv.amountDue) || 0), 0);
                                        const uniqueProjectsCount = new Set(clientInvoices.map(inv => inv.projectName).filter(Boolean)).size;

                                        return (
                                            <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden shrink-0">
                                                            {client.avatarUrl ? (
                                                                <img src={client.avatarUrl} alt={client.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-sm bg-blue-100 w-full h-full flex items-center justify-center text-blue-700">{getInitials(client.name)}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-semibold text-slate-900">{client.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500 text-sm">{client.email}</td>
                                                <td className="px-6 py-4 text-slate-500 text-sm">{uniqueProjectsCount} {uniqueProjectsCount === 1 ? 'Project' : 'Projects'}</td>
                                                <td className="px-6 py-4 text-slate-900 font-medium">
                                                    ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${client.status === 'Active'
                                                        ? 'bg-green-50 text-green-700 ring-green-600/20'
                                                        : 'bg-slate-100 text-slate-600 ring-slate-500/10'
                                                        }`}>
                                                        {client.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => openEditModal(client)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => confirmDelete(client.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50 gap-4">
                            <p className="text-sm text-slate-500">
                                Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to <span className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, sortedClients.length)}</span> of <span className="font-medium text-slate-900">{sortedClients.length}</span> results
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden text-slate-900">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 gap-4">
                            <h2 className="text-xl font-bold">{currentClient ? 'Edit Client' : 'New Client'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                                    <input
                                        type="text"
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="+1 234 567 890"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="123 Main St, City"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Client'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden text-slate-900">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold mb-2">Delete Client?</h2>
                            <p className="text-slate-500 mb-6">
                                Are you sure you want to delete this client? This action cannot be undone and will remove all associated data.
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

export default Clients;
