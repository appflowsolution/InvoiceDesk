import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, Download, Edit2, Trash2, ChevronLeft, ChevronRight, X, FolderKanban } from 'lucide-react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface Project {
    id: string;
    name: string;
    description: string;
    clientName: string;
    status: 'Active' | 'Completed' | 'On Hold';
}

const Projects: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentProject, setCurrentProject] = useState<Project | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        clientName: '',
        status: 'Active' as 'Active' | 'Completed' | 'On Hold'
    });
    const [clients, setClients] = useState<{ id: string, name: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const itemsPerPage = 7;
    const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name));
    const totalPages = Math.ceil(sortedProjects.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProjects = sortedProjects.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        // Fetch Projects real-time
        const unsubscribeProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
            const projectsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Project[];
            setProjects(projectsData);
        });

        // Fetch Clients for the dropdown
        const unsubscribeClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name
            }));
            setClients(clientsData);
        });

        return () => {
            unsubscribeProjects();
            unsubscribeClients();
        };
    }, []);

    const openAddModal = () => {
        setCurrentProject(null);
        setFormData({ name: '', description: '', clientName: '', status: 'Active' });
        setIsModalOpen(true);
    };

    const openEditModal = (project: Project) => {
        setCurrentProject(project);
        setFormData({
            name: project.name,
            description: project.description || '',
            clientName: project.clientName || '',
            status: project.status
        });
        setIsModalOpen(true);
    };

    const confirmDelete = (id: string) => {
        setProjectToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!projectToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'projects', projectToDelete));
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
        } catch (error) {
            console.error("Error deleting document: ", error);
            alert("Failed to delete project.");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        setIsSubmitting(true);

        try {
            if (currentProject) {
                // Update
                const projectRef = doc(db, 'projects', currentProject.id);
                await updateDoc(projectRef, {
                    name: formData.name,
                    description: formData.description,
                    clientName: formData.clientName,
                    status: formData.status
                });
            } else {
                // Add
                await addDoc(collection(db, 'projects'), {
                    name: formData.name,
                    description: formData.description,
                    clientName: formData.clientName,
                    status: formData.status,
                    createdAt: serverTimestamp()
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving document: ", error);
            alert("Failed to save project.");
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
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <FolderKanban className="w-8 h-8 text-blue-600" />
                            Projects
                        </h1>
                        <p className="text-slate-500 text-base">
                            Manage all your active and past client projects.
                        </p>
                    </div>
                    <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-colors">
                        <Plus className="w-5 h-5" />
                        New Project
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
                            placeholder="Search projects..."
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
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Project Name</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Client</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-slate-900 text-xs font-semibold uppercase tracking-wider text-center">Status</th>
                                    <th className="px-6 py-4 text-slate-500 text-xs font-semibold uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No projects found. Click "New Project" to add one.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProjects.map((project) => (
                                        <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                                                        <FolderKanban className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{project.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-900 text-sm font-medium">
                                                {project.clientName || <span className="text-slate-400 italic">No client</span>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-sm max-w-[200px] truncate">
                                                {project.description || <span className="text-slate-400 italic">No description</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${project.status === 'Active' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                    project.status === 'Completed' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' :
                                                        'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
                                                    }`}>
                                                    {project.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEditModal(project)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => confirmDelete(project.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
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
                                Showing <span className="font-medium text-slate-900">{startIndex + 1}</span> to <span className="font-medium text-slate-900">{Math.min(startIndex + itemsPerPage, sortedProjects.length)}</span> of <span className="font-medium text-slate-900">{sortedProjects.length}</span> results
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
                            <h2 className="text-xl font-bold">{currentProject ? 'Edit Project' : 'New Project'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="e.g. Website Redesign"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Client</label>
                                <select
                                    required
                                    value={formData.clientName}
                                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                >
                                    <option value="">Select a client</option>
                                    {clients.map(client => (
                                        <option key={client.id} value={client.name}>{client.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                                    placeholder="Brief description of the project..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                >
                                    <option value="Active">Active</option>
                                    <option value="Completed">Completed</option>
                                    <option value="On Hold">On Hold</option>
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
                                    {isSubmitting ? 'Saving...' : 'Save Project'}
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
                            <h2 className="text-xl font-bold mb-2">Delete Project?</h2>
                            <p className="text-slate-500 mb-6">
                                Are you sure you want to delete this project? This action cannot be undone.
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

export default Projects;
