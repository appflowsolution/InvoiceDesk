import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { collection, addDoc, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import ServiceTable, { type ServiceItem } from './ServiceTable';
import { PrintableInvoice, type IssuerProfile } from './InvoiceView';
import { X, ArrowLeft, Download } from 'lucide-react';

const InvoiceForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [invoiceId, setInvoiceId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [clientDetail, setClientDetail] = useState('');
    const [clientContact, setClientContact] = useState('');
    const [clientAddress, setClientAddress] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending' | 'Partial'>('Pending');
    const [amountPaid, setAmountPaid] = useState(0);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [companies, setCompanies] = useState<IssuerProfile[]>([]);

    const [projects, setProjects] = useState<{ id: string, name: string, clientName?: string }[]>([]);
    const [clients, setClients] = useState<any[]>([]);

    const [serviceItems, setServiceItems] = useState<ServiceItem[]>([
        { id: crypto.randomUUID(), description: '', qty: 1, rate: 0 }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    const handleDownloadPDF = () => {
        const element = document.getElementById('printable-invoice');
        if (!element) return;

        const opt: any = {
            margin: [10, 10, 10, 10],
            filename: `${invoiceId || 'invoice'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [issuer, setIssuer] = useState<IssuerProfile>({
        companyName: 'InvoiceDesk Inc.',
        address: '123 Billing Avenue',
        cityStateZip: 'Tech District, CA 90210',
        phone: '+1 (555) 123-4567',
        email: 'contact@invoicedesk.app',
        website: 'www.invoicedesk.app'
    });

    useEffect(() => {
        if (!id) {
            // Generate random Invoice ID like INV-#2023-0842
            const year = new Date().getFullYear();
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            setInvoiceId(`INV-#${year}-${randomNum}`);

            // Set default date to today
            const today = new Date();
            const yyyyMmDd = today.toISOString().split('T')[0];
            setIssueDate(yyyyMmDd);

            // Default due date to +7 days
            const due = new Date(today);
            due.setDate(due.getDate() + 7);
            setDueDate(due.toISOString().split('T')[0]);
        } else {
            // Fetch existing invoice
            const fetchInvoice = async () => {
                try {
                    const docSnap = await getDoc(doc(db, 'invoices', id));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setInvoiceId(data.invoiceId || '');
                        setProjectName(data.projectName || '');
                        setClientDetail(data.clientDetail || '');
                        setClientContact(data.clientContact || '');
                        setClientAddress(data.clientAddress || '');
                        setIssueDate(data.issueDate || '');
                        setDueDate(data.dueDate || '');
                        setAmountPaid(data.amountPaid || 0);
                        setPaymentStatus(data.paymentStatus || 'Pending');

                        // Items from DB arrive without 'id' (removed during save), so we need to add a temporary ID back for rendering
                        const fetchedItems = data.items && data.items.length > 0
                            ? data.items.map((item: Omit<ServiceItem, 'id'>) => ({ ...item, id: crypto.randomUUID() }))
                            : [{ id: crypto.randomUUID(), description: '', qty: 1, rate: 0 }];

                        setServiceItems(fetchedItems);

                        // Load company data if present
                        if (data.companyId) {
                            setSelectedCompanyId(data.companyId);
                        }
                        if (data.issuerSnapshot) {
                            setIssuer(data.issuerSnapshot);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching invoice:", err);
                }
            };
            fetchInvoice();
        }

        // Fetch projects and clients
        const unsubProjects = onSnapshot(collection(db, 'projects'), (snapshot) => {
            setProjects(snapshot.docs.map(doc => ({
                id: doc.id,
                name: doc.data().name,
                clientName: doc.data().clientName || ''
            })));
        });

        const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
            setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubCompanies = onSnapshot(collection(db, 'companies'), (snapshot) => {
            const comps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as IssuerProfile[];
            setCompanies(comps);

            // Set default company if none selected and it's a new invoice
            if (!id && comps.length > 0) {
                const defaultComp = comps.find(c => c.isDefault) || comps[0];
                setSelectedCompanyId(defaultComp.id || '');
                setIssuer(defaultComp);
            }
        });

        return () => {
            unsubProjects();
            unsubClients();
            unsubCompanies();
        };
    }, [id]);

    // Synchronize due date when issue date changes, but ONLY if it's a new invoice
    useEffect(() => {
        if (!id && issueDate) {
            const currentIssueDate = new Date(issueDate);
            const newDueDate = new Date(currentIssueDate);
            newDueDate.setDate(newDueDate.getDate() + 7);
            const formattedDueDate = newDueDate.toISOString().split('T')[0];
            setDueDate(formattedDueDate);
        }
    }, [issueDate, id]);

    // Synchronize client details when clientDetail changes
    useEffect(() => {
        if (clientDetail && clients.length > 0) {
            const trimmedDetail = clientDetail.trim().toLowerCase();
            const client = clients.find(c => (c.name || '').trim().toLowerCase() === trimmedDetail);
            if (client) {
                setClientContact(client.contact || '');
                setClientAddress(client.address || '');
            }
        }
    }, [clientDetail, clients]);

    const subtotal = serviceItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const taxRate = 0; // 0% by default based on requirements
    const tax = subtotal * taxRate;
    const amountDue = subtotal + tax;

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const companyId = e.target.value;
        setSelectedCompanyId(companyId);
        const company = companies.find(c => c.id === companyId);
        if (company) {
            setIssuer(company);
        }
    };

    const handleSave = async (status: 'Registered' | 'Draft') => {
        setError('');
        setSuccess('');

        if (!projectName.trim()) {
            setError('Project Name is required.');
            return;
        }

        setIsSubmitting(true);

        try {
            const invoiceData = {
                invoiceId,
                projectName,
                clientDetail,
                clientContact,
                clientAddress,
                issueDate,
                dueDate,
                items: serviceItems.map(({ id, ...rest }) => rest),
                subtotal,
                tax,
                amountDue,
                amountPaid: id ? amountPaid : 0,
                paymentStatus: id ? paymentStatus : 'Pending',
                status,
                companyId: selectedCompanyId,
                issuerSnapshot: issuer, // Save full snapshot for historical accuracy
                updatedAt: new Date().toISOString()
            };

            if (id) {
                await updateDoc(doc(db, 'invoices', id), invoiceData);
                setSuccess(`Invoice successfully updated!`);
                setTimeout(() => navigate('/invoices'), 1500);
            } else {
                await addDoc(collection(db, 'invoices'), { ...invoiceData, createdAt: new Date().toISOString() });
                setSuccess(`Invoice successfully ${status === 'Draft' ? 'saved as draft' : 'registered'}!`);

                if (status === 'Registered') {
                    setProjectName('');
                    setClientDetail('');
                    setClientContact('');
                    setClientAddress('');
                    setServiceItems([{ id: crypto.randomUUID(), description: '', qty: 1, rate: 0 }]);
                    const year = new Date().getFullYear();
                    const randomNum = Math.floor(1000 + Math.random() * 9000);
                    setInvoiceId(`INV-#${year}-${randomNum}`);
                }
            }
        } catch (err: any) {
            console.error('Error adding document: ', err);
            setError('Failed to save the invoice. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen p-8 lg:pl-80">
            <div className="max-w-7xl mx-auto">

                {/* Header section */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/invoices')}
                        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-6 font-medium w-fit"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Invoices
                    </button>
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{id ? 'Edit Invoice' : 'Create New Invoice'}</h2>
                            <p className="text-slate-500 mt-1">{id ? 'Modify an existing billing document.' : 'Issue professional billing documents to your clients.'}</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/invoices')}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSave('Draft')}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-md font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-50"
                            >
                                Save as Draft
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium hover:bg-slate-200 transition-colors shadow-sm"
                            >
                                Preview Mode
                            </button>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}
                {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">{success}</div>}

                {/* Form Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <h3 className="text-lg font-semibold text-slate-800">General Information</h3>
                        <div className="w-64">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Issuing Company</label>
                            <select
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-slate-50"
                                value={selectedCompanyId}
                                onChange={handleCompanyChange}
                            >
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.companyName}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Project Name <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white shadow-sm"
                                value={projectName}
                                onChange={(e) => {
                                    const selectedProjName = e.target.value;
                                    setProjectName(selectedProjName);

                                    // Auto-select client if project has one
                                    const project = projects.find(p => (p.name || '').trim().toLowerCase() === selectedProjName.trim().toLowerCase());
                                    if (project && project.clientName) {
                                        setClientDetail(project.clientName);
                                    }
                                }}
                            >
                                <option value="">Select a project</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Invoice ID
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 text-slate-500 rounded-md cursor-not-allowed shadow-sm"
                                value={invoiceId}
                                readOnly
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Client Detail
                            </label>
                            <select
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white shadow-sm"
                                value={clientDetail}
                                onChange={(e) => setClientDetail(e.target.value)}
                            >
                                <option value="">Select a client</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Hidden state for background processing, but not editable by user as per request */}
                        <div className="hidden">
                            <input type="hidden" value={clientContact} />
                            <input type="hidden" value={clientAddress} />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Issue Date
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Due Date
                            </label>
                            <input
                                type="date"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <ServiceTable items={serviceItems} onChange={setServiceItems} />

                    {/* Totals Section */}
                    <div className="mt-8 flex justify-end">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-medium">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 pb-3 border-b border-slate-200">
                                <span>Tax (0%)</span>
                                <span className="font-medium">${tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-slate-800 pt-1">
                                <span className="font-bold text-lg">Amount Due</span>
                                <span className="font-bold text-2xl text-blue-700">${amountDue.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="button"
                            onClick={() => handleSave('Registered')}
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            {isSubmitting ? 'Processing...' : (id ? 'UPDATE INVOICE' : 'GENERATE & REGISTER INVOICE')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Preview Modal Overlay */}
            {
                showPreview && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-slate-50 rounded-xl shadow-xl w-full max-w-5xl my-8 relative flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-xl sticky top-0 z-10 shrink-0">
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                    Invoice Preview
                                </h3>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <Download className="w-4 h-4" /> Download PDF
                                    </button>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            {/* Modal Body */}
                            <div className="p-8 overflow-y-auto grow">
                                <PrintableInvoice
                                    invoice={{
                                        invoiceId,
                                        projectName,
                                        clientDetail,
                                        clientContact,
                                        clientAddress,
                                        issueDate,
                                        dueDate,
                                        items: serviceItems.map(({ id, ...rest }) => rest) as any,
                                        subtotal,
                                        tax,
                                        amountDue,
                                        status: 'Draft'
                                    }}
                                    issuer={issuer}
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default InvoiceForm;
