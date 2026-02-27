import React, { useState, useEffect } from 'react';
import { Save, Building2, Mail, Phone, MapPin, Globe, CheckCircle2, Settings as SettingsIcon, Plus, Trash2, Edit2, X } from 'lucide-react';
import { collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface IssuerProfile {
    id: string;
    companyName: string;
    email: string;
    phone: string;
    address: string;
    cityStateZip: string;
    website: string;
    isDefault?: boolean;
}

const Settings: React.FC = () => {
    const [companies, setCompanies] = useState<IssuerProfile[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<IssuerProfile | null>(null);

    // Form State
    const [formData, setFormData] = useState<Omit<IssuerProfile, 'id'>>({
        companyName: '',
        email: '',
        phone: '',
        address: '',
        cityStateZip: '',
        website: '',
        isDefault: false
    });

    useEffect(() => {
        const checkMigration = async () => {
            const oldProfileDoc = await getDoc(doc(db, 'settings', 'profile'));
            if (oldProfileDoc.exists()) {
                const data = oldProfileDoc.data();
                // Check if already migrated
                const companiesSnap = await getDocs(collection(db, 'companies'));
                if (companiesSnap.empty) {
                    await addDoc(collection(db, 'companies'), {
                        ...data,
                        createdAt: new Date().toISOString(),
                        isDefault: true
                    });
                    // Optional: remove old doc or mark as migrated
                }
            }
        };

        checkMigration();

        const unsubscribe = onSnapshot(collection(db, 'companies'), (snapshot) => {
            const companyData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as IssuerProfile[];
            setCompanies(companyData);
        });

        return () => unsubscribe();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleOpenModal = (company?: IssuerProfile) => {
        if (company) {
            setEditingCompany(company);
            setFormData({
                companyName: company.companyName,
                email: company.email,
                phone: company.phone,
                address: company.address,
                cityStateZip: company.cityStateZip,
                website: company.website,
                isDefault: company.isDefault || false
            });
        } else {
            setEditingCompany(null);
            setFormData({
                companyName: '',
                email: '',
                phone: '',
                address: '',
                cityStateZip: '',
                website: '',
                isDefault: companies.length === 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (editingCompany) {
                await updateDoc(doc(db, 'companies', editingCompany.id), {
                    ...formData,
                    updatedAt: new Date().toISOString()
                });
            } else {
                await addDoc(collection(db, 'companies'), {
                    ...formData,
                    createdAt: new Date().toISOString()
                });
            }

            // If this company is set as default, unset others (simplified approach)
            if (formData.isDefault) {
                // In a production app, you'd use a transaction or batch
                for (const c of companies) {
                    if (c.id !== editingCompany?.id && c.isDefault) {
                        await updateDoc(doc(db, 'companies', c.id), { isDefault: false });
                    }
                }
            }

            setIsModalOpen(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving company:', error);
            alert('Error saving company. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this company?')) return;
        try {
            await deleteDoc(doc(db, 'companies', id));
        } catch (error) {
            console.error('Error deleting company:', error);
        }
    };

    return (
        <div className="flex-1 ml-64 p-8 bg-slate-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <SettingsIcon className="w-8 h-8 text-blue-600" />
                            Settings
                        </h1>
                        <p className="text-slate-500 mt-1">Manage your business profiles and multi-company preferences.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Add Company
                    </button>
                </div>

                {showSuccess && (
                    <div className="mb-6 flex items-center p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Company settings updated successfully!
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {companies.map(company => (
                        <div key={company.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
                            {company.isDefault && (
                                <div className="absolute top-4 right-4 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-100">
                                    Default
                                </div>
                            )}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div className="flex-1 truncate">
                                    <h3 className="font-bold text-slate-900 truncate">{company.companyName}</h3>
                                    <p className="text-xs text-slate-500 truncate">{company.email}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-start gap-3 text-slate-600">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                    <div className="text-xs">
                                        <p>{company.address}</p>
                                        <p>{company.cityStateZip}</p>
                                    </div>
                                </div>
                                {company.phone && (
                                    <div className="flex items-center gap-3 text-slate-600 text-xs">
                                        <Phone className="w-4 h-4 shrink-0" />
                                        {company.phone}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => handleOpenModal(company)}
                                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                    title="Edit Company"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(company.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                    title="Delete Company"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {companies.length === 0 && (
                        <div className="col-span-full py-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No companies configured yet.</p>
                            <button
                                onClick={() => handleOpenModal()}
                                className="mt-4 text-blue-600 font-bold hover:underline"
                            >
                                Add your first company
                            </button>
                        </div>
                    )}
                </div>

                {/* Company Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 my-8">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {editingCompany ? 'Edit Company' : 'Add New Company'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name *</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="companyName"
                                                    value={formData.companyName}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                    placeholder="Enter company name"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address *</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                    placeholder="billing@company.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phone Number</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                    placeholder="+1 (555) 000-0000"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Street Address *</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                    placeholder="123 Example St."
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">City, State, Zip *</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    name="cityStateZip"
                                                    value={formData.cityStateZip}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                    placeholder="City, ST 12345"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Website</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input
                                                    type="url"
                                                    name="website"
                                                    value={formData.website}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                                    placeholder="https://www.company.com"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center gap-2 px-1">
                                    <input
                                        type="checkbox"
                                        id="isDefault"
                                        name="isDefault"
                                        checked={formData.isDefault}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="isDefault" className="text-sm font-medium text-slate-700">Set as default company for new invoices</label>
                                </div>

                                <div className="mt-8 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <Save className="w-5 h-5" />
                                        {isSaving ? 'Saving...' : (editingCompany ? 'Update' : 'Add Company')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
