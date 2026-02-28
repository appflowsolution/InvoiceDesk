import React, { useState, useEffect } from 'react';
import html2pdf from 'html2pdf.js';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Printer, Download, DollarSign, Calendar, CreditCard, X, Trash2, History, Edit2, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { doc, getDoc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import type { ServiceItem } from './ServiceTable';

export interface Payment {
    date: string;
    amount: number;
    note?: string;
}

export interface InvoiceData {
    id?: string;
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
    amountPaid?: number;
    paymentStatus?: 'Paid' | 'Pending' | 'Partial';
    payments?: Payment[];
    status: string;
}

export interface IssuerProfile {
    id?: string;
    companyName: string;
    address: string;
    cityStateZip: string;
    phone: string;
    email: string;
    website?: string;
    isDefault?: boolean;
}

export const PrintableInvoice: React.FC<{ invoice: InvoiceData, issuer: IssuerProfile }> = ({ invoice, issuer }) => {
    // Priority: Store snapshot in invoice > passed issuer prop
    const displayIssuer = (invoice as any).issuerSnapshot || issuer;
    return (
        <div id="printable-invoice" className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:block print-top-margin">
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6 print:mb-6 print:pb-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">INVOICE</h1>
                    <p className="text-slate-500 font-medium">{invoice.invoiceId}</p>
                </div>

                <div className="text-right">
                    <h3 className="text-xl font-bold text-slate-800">{displayIssuer.companyName}</h3>
                    <p className="text-slate-500 text-sm mt-1">{displayIssuer.address}</p>
                    <p className="text-slate-500 text-sm">{displayIssuer.cityStateZip}</p>
                    <p className="text-slate-500 text-sm mt-1">{displayIssuer.email}</p>
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
                        <span className="font-bold text-lg">Total Amount</span>
                        <span className="font-black text-3xl text-slate-900">${(invoice.amountDue || 0).toFixed(2)}</span>
                    </div>
                    {invoice.amountPaid ? (
                        <>
                            <div className="flex justify-between text-green-600 pt-1 border-t border-slate-100">
                                <span className="text-sm font-medium">Amount Paid</span>
                                <span className="font-bold">-${(invoice.amountPaid || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-blue-600 pt-2 border-t border-blue-100 mt-2">
                                <span className="font-bold text-lg">Balance Due</span>
                                <span className="font-black text-3xl">${((invoice.amountDue || 0) - (invoice.amountPaid || 0)).toFixed(2)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between items-center text-blue-600 pt-2 border-t border-blue-100 mt-2">
                            <span className="font-bold text-lg">Balance Due</span>
                            <span className="font-black text-3xl">${(invoice.amountDue || 0).toFixed(2)}</span>
                        </div>
                    )}
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
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNote, setPaymentNote] = useState('');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        type: 'confirm' | 'info' | 'error' | 'success';
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });
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

        const unsubscribeCompanies = onSnapshot(query(collection(db, 'companies'), where('userId', '==', auth.currentUser?.uid || '')), (snapshot) => {
            if (!snapshot.empty) {
                const comps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as IssuerProfile[];
                const defaultComp = comps.find(c => c.isDefault) || comps[0];
                setIssuer(defaultComp);
            }
        });

        fetchInvoice();
        return () => unsubscribeCompanies();
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
            margin: [5, 5, 5, 5],
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

    const showAlert = (type: 'confirm' | 'info' | 'error' | 'success', title: string, message: string, onConfirm?: () => void) => {
        setAlertConfig({ isOpen: true, type, title, message, onConfirm });
    };

    const handleCloseAlert = () => {
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleOpenEditPayment = (index: number) => {
        if (!invoice || !invoice.payments) return;
        const payment = invoice.payments[index];
        setEditingPaymentIndex(index);
        setPaymentAmount(payment.amount.toString());
        setPaymentDate(payment.date);
        setPaymentNote(payment.note || '');
        setIsPaymentModalOpen(true);
    };

    const handleRecordPayment = async () => {
        if (!id || !invoice) return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            showAlert('error', 'Invalid Amount', 'Please enter a valid payment amount.');
            return;
        }

        const remainingBalance = invoice.amountDue - (invoice.amountPaid || 0);

        // If editing, we should add the current payment back to the balance for validation
        let adjustedBalance = remainingBalance;
        if (editingPaymentIndex !== null && invoice.payments) {
            adjustedBalance += invoice.payments[editingPaymentIndex].amount;
        }

        if (amount > adjustedBalance + 0.01) {
            showAlert('error', 'Limit Exceeded', `Payment exceeds the remaining balance ($${adjustedBalance.toFixed(2)}).`);
            return;
        }

        setIsSubmittingPayment(true);
        try {
            const paymentObj: Payment = {
                date: paymentDate,
                amount: amount,
                note: paymentNote
            };

            let updatedPayments: Payment[];
            let newAmountPaid: number;

            if (editingPaymentIndex !== null && invoice.payments) {
                // Editing existing payment
                updatedPayments = [...invoice.payments];
                updatedPayments[editingPaymentIndex] = paymentObj;
                newAmountPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
            } else {
                // Recording new payment
                updatedPayments = [...(invoice.payments || []), paymentObj];
                newAmountPaid = (invoice.amountPaid || 0) + amount;
            }

            let newPaymentStatus: 'Paid' | 'Partial' | 'Pending' = 'Partial';
            if (newAmountPaid >= invoice.amountDue - 0.01) {
                newPaymentStatus = 'Paid';
            } else if (newAmountPaid <= 0.01) {
                newPaymentStatus = 'Pending';
            }

            await updateDoc(doc(db, 'invoices', id), {
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                payments: updatedPayments,
                updatedAt: new Date().toISOString()
            });

            // Refresh local state
            setInvoice(prev => prev ? {
                ...prev,
                amountPaid: newAmountPaid,
                paymentStatus: newPaymentStatus,
                payments: updatedPayments
            } : null);

            setPaymentAmount('');
            setPaymentNote('');
            setIsPaymentModalOpen(false);
            setEditingPaymentIndex(null);
        } catch (error) {
            console.error("Error saving payment:", error);
            showAlert('error', 'Error', 'Failed to save payment record.');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const handleDeletePayment = async (paymentIndex: number) => {
        if (!id || !invoice || !invoice.payments) return;

        showAlert(
            'confirm',
            'Delete Payment',
            'Are you sure you want to delete this payment record? This will update the invoice balance and status.',
            async () => {
                try {
                    const paymentToDelete = invoice.payments![paymentIndex];
                    const updatedPayments = invoice.payments!.filter((_, index) => index !== paymentIndex);
                    const newAmountPaid = (invoice.amountPaid || 0) - paymentToDelete.amount;

                    let newPaymentStatus: 'Paid' | 'Partial' | 'Pending' = 'Pending';
                    if (newAmountPaid > 0.01) {
                        if (newAmountPaid < invoice.amountDue - 0.01) {
                            newPaymentStatus = 'Partial';
                        } else {
                            newPaymentStatus = 'Paid';
                        }
                    } else {
                        newPaymentStatus = 'Pending';
                    }

                    await updateDoc(doc(db, 'invoices', id), {
                        amountPaid: Math.max(0, newAmountPaid),
                        paymentStatus: newPaymentStatus,
                        payments: updatedPayments,
                        updatedAt: new Date().toISOString()
                    });

                    setInvoice(prev => prev ? {
                        ...prev,
                        amountPaid: Math.max(0, newAmountPaid),
                        paymentStatus: newPaymentStatus,
                        payments: updatedPayments
                    } : null);

                    handleCloseAlert();
                } catch (error) {
                    console.error("Error deleting payment:", error);
                    showAlert('error', 'Error', 'Failed to delete payment record.');
                }
            }
        );
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
                        {invoice.paymentStatus !== 'Paid' && (
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <DollarSign className="w-4 h-4" /> Record Payment
                            </button>
                        )}
                    </div>
                </div>

                {/* Printable Invoice Card */}
                <PrintableInvoice invoice={invoice} issuer={issuer} />

                {/* Payment History Section */}
                <div className="mt-12 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <History className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
                                <p className="text-xs text-slate-500">View and manage payments recorded for this invoice.</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Note</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.payments && invoice.payments.length > 0 ? (
                                    invoice.payments.map((payment, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-slate-700">
                                                {new Date(payment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 italic">
                                                {payment.note || '---'}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                                                ${payment.amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => handleOpenEditPayment(idx)}
                                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit payment"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePayment(idx)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete payment"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-slate-400 italic text-sm">
                                            No payments recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="relative p-8">
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {editingPaymentIndex !== null ? 'Edit Payment' : 'Record Payment'}
                                    </h3>
                                    <p className="text-slate-500 text-sm">
                                        {editingPaymentIndex !== null ? 'Update the details of this payment.' : 'Update the payment status for this invoice.'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Remaining Balance</span>
                                        <span className="text-xl font-black text-blue-600">
                                            ${(invoice.amountDue - (invoice.amountPaid || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-slate-400" />
                                            Amount Received
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                            <input
                                                type="number"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full pl-8 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            Payment Date
                                        </label>
                                        <input
                                            type="date"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Note (Optional)</label>
                                        <textarea
                                            value={paymentNote}
                                            onChange={(e) => setPaymentNote(e.target.value)}
                                            placeholder="Bank transfer, cash, etc."
                                            rows={2}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setIsPaymentModalOpen(false);
                                            setEditingPaymentIndex(null);
                                            setPaymentAmount('');
                                            setPaymentNote('');
                                        }}
                                        className="px-6 py-3 w-full text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all order-2 sm:order-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRecordPayment}
                                        disabled={isSubmittingPayment || !paymentAmount}
                                        className="px-6 py-3 w-full bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none order-1 sm:order-2 flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingPayment ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            editingPaymentIndex !== null ? 'Update Payment' : 'Confirm Payment'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Alert/Confirm Modal */}
            {alertConfig.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden scale-in-center animate-in fade-in zoom-in duration-300">
                        <div className="p-8 text-center">
                            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-opacity-10
                                ${alertConfig.type === 'error' ? 'bg-red-50 text-red-500 shadow-red-500/20' :
                                    alertConfig.type === 'success' ? 'bg-green-50 text-green-500 shadow-green-500/20' :
                                        alertConfig.type === 'confirm' ? 'bg-amber-50 text-amber-500 shadow-amber-500/20' :
                                            'bg-blue-50 text-blue-500 shadow-blue-500/20'}`}>
                                {alertConfig.type === 'error' && <AlertCircle className="w-10 h-10" />}
                                {alertConfig.type === 'success' && <CheckCircle2 className="w-10 h-10" />}
                                {alertConfig.type === 'confirm' && <HelpCircle className="w-10 h-10" />}
                                {alertConfig.type === 'info' && <AlertCircle className="w-10 h-10" />}
                            </div>

                            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">{alertConfig.title}</h2>
                            <p className="text-slate-500 text-sm leading-relaxed mb-8 px-2 font-medium">
                                {alertConfig.message}
                            </p>

                            <div className="flex flex-col gap-3">
                                {alertConfig.type === 'confirm' ? (
                                    <>
                                        <button
                                            onClick={alertConfig.onConfirm}
                                            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 active:scale-[0.97] transition-all text-sm tracking-wide"
                                        >
                                            Confirm Action
                                        </button>
                                        <button
                                            onClick={handleCloseAlert}
                                            className="w-full py-4 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 active:scale-[0.97] transition-all text-sm"
                                        >
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={handleCloseAlert}
                                        className={`w-full py-4 text-white font-black rounded-2xl active:scale-[0.97] transition-all text-sm tracking-wide shadow-lg
                                            ${alertConfig.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' :
                                                alertConfig.type === 'success' ? 'bg-green-500 hover:bg-green-600 shadow-green-200' :
                                                    'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
                                    >
                                        Dismiss
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceView;
