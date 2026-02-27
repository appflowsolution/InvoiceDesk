import React from 'react';
import { Trash2, Plus } from 'lucide-react';

export interface ServiceItem {
    id: string;
    description: string;
    qty: number;
    rate: number;
}

interface ServiceTableProps {
    items: ServiceItem[];
    onChange: (items: ServiceItem[]) => void;
}

const ServiceTable: React.FC<ServiceTableProps> = ({ items, onChange }) => {
    const handleAddRow = () => {
        onChange([...items, { id: crypto.randomUUID(), description: '', qty: 1, rate: 0 }]);
    };

    const handleRemoveRow = (id: string) => {
        onChange(items.filter(item => item.id !== id));
    };

    const handleChange = (id: string, field: keyof ServiceItem, value: string | number) => {
        onChange(items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        }));
    };

    return (
        <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Service Items & Pricing</h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="py-3 px-4 font-medium text-slate-500 text-sm">Description</th>
                            <th className="py-3 px-4 font-medium text-slate-500 text-sm w-24">QTY</th>
                            <th className="py-3 px-4 font-medium text-slate-500 text-sm w-32">Rate (USD)</th>
                            <th className="py-3 px-4 font-medium text-slate-500 text-sm w-32">Amount</th>
                            <th className="py-3 px-4 font-medium text-slate-500 text-sm w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr key={item.id} className="border-b border-slate-100 last:border-none group hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4">
                                    <input
                                        type="text"
                                        placeholder="Item description"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm bg-white"
                                        value={item.description}
                                        onChange={(e) => handleChange(item.id, 'description', e.target.value)}
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm bg-white"
                                        value={item.qty}
                                        onChange={(e) => handleChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                    />
                                </td>
                                <td className="py-3 px-4">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm bg-white"
                                            value={item.rate}
                                            onChange={(e) => handleChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                        />
                                    </div>
                                </td>
                                <td className="py-3 px-4 font-medium text-slate-700">
                                    ${(item.qty * item.rate).toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveRow(item.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-md hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                type="button"
                onClick={handleAddRow}
                className="mt-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
                <Plus className="w-4 h-4 mr-1" />
                Add New Line Item
            </button>
        </div>
    );
};

export default ServiceTable;
