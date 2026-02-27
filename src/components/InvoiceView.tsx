import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ChevronLeft, Printer, Download } from 'lucide-react';
import type { ServiceItem } from './ServiceTable';

export interface InvoiceData {
    invoiceId: string;
    projectName: string;
    clientDetail: string;
    clientContact?: string;
    clientAddress?: string;
    issueDate: string;
    dueDate: string;
    items: ServiceItem[];
    subtotal: number;
    tax: number;
    amountDue: number;
    status: string;
}

export interface IssuerProfile {
    companyName: string;
    address: string;
    cityStateZip: string;
    phone: string;
    email: string;
    website?: string;
}

export const PrintableInvoice: React.FC<{ invoice: InvoiceData, issuer: IssuerProfile }> = ({ invoice, issuer }) => {
    return (
        <div id="printable-invoice" className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block print-top-margin">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6 print:mb-6 print:pb-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">INVOICE</h1>
                    <p className="text-slate-500 font-medium">{invoice.invoiceId}</p>
                </div>

                <div className="text-right">
                    <h3 className="text-xl font-bold text-slate-800">{issuer.companyName}</h3>
                    <p className="text-slate-500 text-sm mt-1">{issuer.address}</p>
                    <p className="text-slate-500 text-sm">{issuer.cityStateZip}</p>
                    <p className="text-slate-500 text-sm mt-1">{issuer.email}</p>
                </div>
            </div>

            {/* Invoice Info Details */}
            <div className="grid grid-cols-2 gap-12 mb-8 print:mb-6">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To</h4>
                        <div className="space-y-1">
                            <p className="text-slate-700 text-sm"><span className="font-bold text-slate-900">Client:</span> {invoice.clientDetail || '---'}</p>
                            <p className="text-slate-700 text-sm"><span className="font-bold text-slate-900">Contact:</span> {invoice.clientContact || '---'}</p>
                            <p className="text-slate-700 text-sm"><span className="font-bold text-slate-900">Address:</span> {invoice.clientAddress || '---'}</p>
                            <p className="text-slate-700 text-sm pt-1"><span className="font-bold text-slate-900">Project:</span> <span className="font-bold">{invoice.projectName || 'General Services'}</span></p>
                        </div>
                    </div>
                </div>
                <div className="text-right space-y-6">
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
            <div className="mb-6 print:mb-4">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="py-3 text-slate-800 font-semibold text-sm">Description</th>
                            <th className="py-3 text-slate-800 font-semibold text-sm text-center w-24">Qty / Hours</th>
                            <th className="py-3 text-slate-800 font-semibold text-sm text-right w-24">Rate</th>
                            <th className="py-3 text-slate-800 font-semibold text-sm text-right w-24">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {invoice.items && invoice.items.length > 0 ? invoice.items.map((item, index) => (
                            <tr key={index}>
                                <td className="py-4 text-slate-700">{item.description}</td>
                                <td className="py-4 text-slate-700 text-center w-24">{item.qty}</td>
                                <td className="py-4 text-slate-700 text-right w-24">${item.rate.toFixed(2)}</td>
                                <td className="py-4 text-slate-900 font-medium text-right w-24">${(item.qty * item.rate).toFixed(2)}</td>
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
            <div className="mt-8 pt-4 border-t border-slate-100 text-slate-500 text-sm print:mt-12 print:pt-4">
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
    const [issuer, setIssuer] = useState<IssuerProfile>({
        companyName: 'InvoiceDesk Inc.',
        address: '123 Billing Avenue',
        cityStateZip: 'Tech District, CA 90210',
        phone: '+1 (555) 123-4567',
        email: 'contact@invoicedesk.app',
        website: 'www.invoicedesk.app'
    });

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

        const unsubscribeIssuer = onSnapshot(doc(db, 'settings', 'profile'), (doc) => {
            if (doc.exists()) {
                setIssuer(doc.data() as IssuerProfile);
            }
        });

        fetchInvoice();
        return () => unsubscribeIssuer();
    }, [id]);

    if (loading) {
        return (
            <div className="flex-1 bg-slate-50 min-h-screen p-8 lg:pl-80 flex items-center justify-center">
                <div className="text-slate-500 animate-pulse flex items-center gap-2">
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

    const handleDownloadPDF = () => {
        const element = document.getElementById('printable-invoice');
        if (!element) return;

        const opt: any = {
            margin: [5, 5, 5, 5], // Reduced margin to fit better
            filename: `${invoice.invoiceId || 'invoice'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: 'avoid-all' }
        };

        html2pdf().set(opt).from(element).save();
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen p-8 lg:pl-80">
            <div className="max-w-5xl mx-auto">

                {/* Header section (Non-printable) */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 print:hidden">
                    <div className="flex flex-col gap-2">
                        <Link to="/invoices" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors">
                            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Invoices
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
                            onClick={handleDownloadPDF}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Card */}
                <PrintableInvoice invoice={invoice} issuer={issuer} />
            </div>
        </div>
    );
};

export default InvoiceView;
