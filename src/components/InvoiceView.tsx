import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ArrowLeft, Printer, Download, FileText } from 'lucide-react';
import type { ServiceItem } from './ServiceTable';

export interface InvoiceData {
    invoiceId: string;
    projectName: string;
    clientDetail: string;
    issueDate: string;
    dueDate: string;
    items: ServiceItem[];
    subtotal: number;
    tax: number;
    amountDue: number;
    status: string;
}

export const PrintableInvoice: React.FC<{ invoice: InvoiceData }> = ({ invoice }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 print:shadow-none print:border-none print:p-0">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">INVOICE</h1>
                    <p className="text-slate-500 font-medium">{invoice.invoiceId}</p>

                    <div className="mt-6">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${invoice.status === 'Paid' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                            invoice.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 ring-yellow-600/20' :
                                invoice.status === 'Overdue' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                    'bg-slate-50 text-slate-700 ring-slate-600/20'
                            }`}>
                            {invoice.status.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="text-right">
                    <h3 className="text-xl font-bold text-slate-800">InvoiceDesk Inc.</h3>
                    <p className="text-slate-500 text-sm mt-1">123 Billing Avenue</p>
                    <p className="text-slate-500 text-sm">Tech District, CA 90210</p>
                    <p className="text-slate-500 text-sm mt-1">contact@invoicedesk.app</p>
                </div>
            </div>

            {/* Invoice Info Details */}
            <div className="grid grid-cols-2 gap-12 mb-12">
                <div>
                    <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Billed To</h4>
                    <p className="text-lg font-bold text-slate-800">{invoice.clientDetail || 'Valued Client'}</p>
                    <p className="text-slate-500 text-sm mt-1">Project: {invoice.projectName || 'General Services'}</p>
                </div>
                <div className="text-right">
                    <div className="mb-4">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Date of Issue</h4>
                        <p className="text-slate-800 font-medium">{new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</h4>
                        <p className="text-slate-800 font-medium">{new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* Services Items Table */}
            <div className="mb-10">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 text-slate-800 font-semibold text-sm">Description</th>
                            <th className="py-3 text-slate-800 font-semibold text-sm text-center">Qty / Hours</th>
                            <th className="py-3 text-slate-800 font-semibold text-sm text-right">Rate</th>
                            <th className="py-3 text-slate-800 font-semibold text-sm text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoice.items && invoice.items.length > 0 ? invoice.items.map((item, index) => (
                            <tr key={index}>
                                <td className="py-4 text-slate-700">{item.description}</td>
                                <td className="py-4 text-slate-700 text-center">{item.qty}</td>
                                <td className="py-4 text-slate-700 text-right">${item.rate.toFixed(2)}</td>
                                <td className="py-4 text-slate-900 font-medium text-right">${(item.qty * item.rate).toFixed(2)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="py-4 text-slate-500 text-center italic">No services listed.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex justify-end pt-6 border-t border-slate-200">
                <div className="w-72 space-y-3">
                    <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-medium">${(invoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pb-3 border-b border-slate-200">
                        <span>Tax (0%)</span>
                        <span className="font-medium">${(invoice.tax || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-900 pt-2">
                        <span className="font-bold text-lg">Amount Due</span>
                        <span className="font-black text-3xl text-blue-600">${(invoice.amountDue || 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Footer / Notes */}
            <div className="mt-16 pt-8 border-t border-slate-100 text-slate-500 text-sm">
                <p className="font-medium text-slate-700 mb-1">Thank you for your business.</p>
                <p>Please send payment within {(new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) / (1000 * 3600 * 24)} days of receiving this invoice.</p>
            </div>
        </div>
    );
};

const InvoiceView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'invoices', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setInvoice(docSnap.data() as InvoiceData);
                } else {
                    console.error("No such invoice!");
                }
            } catch (error) {
                console.error("Error fetching invoice:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, [id]);

    if (loading) {
        return (
            <div className="flex-1 bg-slate-50 min-h-screen p-8 lg:pl-80 flex items-center justify-center">
                <div className="text-slate-500 animate-pulse flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Loading invoice...
                </div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="flex-1 bg-slate-50 min-h-screen p-8 lg:pl-80 flex flex-col items-center justify-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Invoice Not Found</h2>
                <p className="text-slate-500 mb-6">The invoice you are looking for does not exist or has been deleted.</p>
                <Link to="/invoices" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Back to Invoices
                </Link>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen p-8 lg:pl-80">
            <div className="max-w-5xl mx-auto">

                {/* Header section (Non-printable) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 print:hidden">
                    <div className="flex flex-col gap-2">
                        <Link to="/invoices" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Invoices
                        </Link>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Invoice Details</h2>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={handlePrint}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md font-medium hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button
                            onClick={() => alert('PDF Download not implemented yet.')}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Card */}
                <PrintableInvoice invoice={invoice} />
            </div>
        </div>
    );
};

export default InvoiceView;
