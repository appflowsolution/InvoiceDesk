import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ServiceTable, { type ServiceItem } from './ServiceTable';

const InvoiceForm: React.FC = () => {
    const [invoiceId, setInvoiceId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [clientDetail, setClientDetail] = useState('');
    const [issueDate, setIssueDate] = useState('');

    const [serviceItems, setServiceItems] = useState<ServiceItem[]>([
        { id: crypto.randomUUID(), description: '', qty: 1, rate: 0 }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Generate random Invoice ID like INV-#2023-0842
        const year = new Date().getFullYear();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        setInvoiceId(`INV-#${year}-${randomNum}`);

        // Set default date to today
        setIssueDate(new Date().toISOString().split('T')[0]);
    }, []);

    const subtotal = serviceItems.reduce((sum, item) => sum + (item.qty * item.rate), 0);
    const taxRate = 0; // 0% by default based on requirements
    const tax = subtotal * taxRate;
    const amountDue = subtotal + tax;

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
                issueDate,
                items: serviceItems.map(({ id, ...rest }) => rest), // Optional: remove local UUID before saving
                subtotal,
                tax,
                amountDue,
                status,
                createdAt: new Date().toISOString()
            };

            await addDoc(collection(db, 'invoices'), invoiceData);

            setSuccess(`Invoice successfully ${status === 'Draft' ? 'saved as draft' : 'registered'}!`);

            if (status === 'Registered') {
                // Optional: clear form on successful registration
                setProjectName('');
                setClientDetail('');
                setServiceItems([{ id: crypto.randomUUID(), description: '', qty: 1, rate: 0 }]);
                const year = new Date().getFullYear();
                const randomNum = Math.floor(1000 + Math.random() * 9000);
                setInvoiceId(`INV-#${year}-${randomNum}`);
            }
        } catch (err: any) {
            console.error('Error adding document: ', err);
            setError('Failed to save the invoice. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen p-8 pl-80">
            <div className="max-w-4xl mx-auto">

                {/* Header section */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Create New Invoice</h2>
                        <p className="text-slate-500 mt-1">Issue professional billing documents to your clients.</p>
                    </div>
                    <div className="flex gap-3">
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
                            className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-medium hover:bg-slate-200 transition-colors shadow-sm"
                        >
                            Preview Mode
                        </button>
                    </div>
                </div>

                {/* Notifications */}
                {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">{error}</div>}
                {success && <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md">{success}</div>}

                {/* Form Card */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <h3 className="text-lg font-semibold text-slate-800 mb-6 border-b border-slate-100 pb-4">General Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Project Name <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white shadow-sm"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                            >
                                <option value="">Select a project</option>
                                <option value="Website Redesign">Website Redesign</option>
                                <option value="Mobile App Development">Mobile App Development</option>
                                <option value="SEO Optimization">SEO Optimization</option>
                                <option value="Branding Package">Branding Package</option>
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
                            <input
                                type="text"
                                placeholder="Enter client name or company"
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 shadow-sm"
                                value={clientDetail}
                                onChange={(e) => setClientDetail(e.target.value)}
                            />
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
                            {isSubmitting ? 'Processing...' : 'GENERATE & REGISTER INVOICE'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceForm;
