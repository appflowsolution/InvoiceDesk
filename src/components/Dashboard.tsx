import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, where } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import {
    FileText,
    Briefcase,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Clock,
    Plus,
    Download,
    CheckCircle2,
    Send,
    UserPlus,
    Settings as SettingsIcon,
    LayoutDashboard
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface ActivityItem {
    id: string;
    type: 'invoice_paid' | 'invoice_sent' | 'client_added' | 'project_started';
    title: string;
    subtitle: string;
    timestamp: string;
    amount?: number;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalRevenue: 0,
        pendingAmount: 0,
        activeProjects: 0,
        totalClients: 0,
        revenueTrend: 0,
        pendingTrend: 0,
        monthlyData: [] as { month: string, year: number, revenue: number }[]
    });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [timeframe, setTimeframe] = useState<'1m' | '3m' | '6m' | '1y' | 'all'>('6m');

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch Invoices for KPIs and Chart
        const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('userId', '==', user.uid)), (snapshot) => {
            let revenue = 0;
            let pending = 0;

            // For trends and chart
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            let currentMonthRevenue = 0;
            let lastMonthRevenue = 0;
            let currentMonthPending = 0;
            let lastMonthPending = 0;

            // Determine number of months to show based on timeframe
            let monthsToShow = 6;
            if (timeframe === '1m') monthsToShow = 2; // Show at least 2 points to draw a line
            else if (timeframe === '3m') monthsToShow = 3;
            else if (timeframe === '6m') monthsToShow = 6;
            else if (timeframe === '1y') monthsToShow = 12;
            else if (timeframe === 'all') monthsToShow = 24; // Show up to 2 years for layout

            // Initialize months for chart
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const lastXMonths = Array.from({ length: monthsToShow }, (_, i) => {
                const d = new Date();
                d.setDate(1); // Set to 1st to avoid month skipping (e.g., if today is 31st)
                d.setMonth(now.getMonth() - (monthsToShow - 1 - i));
                return {
                    month: monthNames[d.getMonth()],
                    monthIdx: d.getMonth(),
                    year: d.getFullYear(),
                    revenue: 0
                };
            });

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const amountDue = data.amountDue || 0;
                const amountPaid = data.amountPaid || 0;
                const docPending = amountDue - amountPaid;

                if (data.status !== 'Draft') {
                    revenue += amountPaid;
                    pending += docPending;

                    // Trend/Chart logic
                    if (data.issueDate) {
                        // Use T00:00:00 to ensure local date parsing if it's just YYYY-MM-DD
                        const dateStr = data.issueDate.includes('T') ? data.issueDate : `${data.issueDate}T00:00:00`;
                        const issueDate = new Date(dateStr);
                        const m = issueDate.getMonth();
                        const y = issueDate.getFullYear();

                        // Add to current/last month totals for trends
                        if (y === currentYear && m === currentMonth) {
                            currentMonthRevenue += amountPaid;
                            currentMonthPending += docPending;
                        } else if (
                            (y === currentYear && m === currentMonth - 1) ||
                            (y === currentYear - 1 && currentMonth === 0 && m === 11)
                        ) {
                            lastMonthRevenue += amountPaid;
                            lastMonthPending += docPending;
                        }

                        // Add to chart data
                        const chartItem = lastXMonths.find(item => item.monthIdx === m && item.year === y);
                        if (chartItem) {
                            chartItem.revenue += amountPaid;
                        }
                    }
                }
            });

            // Calculate trends
            const calcTrend = (curr: number, prev: number) => {
                if (prev === 0) return curr > 0 ? 100 : 0;
                return ((curr - prev) / prev) * 100;
            };

            setStats(prev => ({
                ...prev,
                totalRevenue: revenue,
                pendingAmount: pending,
                revenueTrend: calcTrend(currentMonthRevenue, lastMonthRevenue),
                pendingTrend: calcTrend(currentMonthPending, lastMonthPending),
                monthlyData: lastXMonths.map(({ month, year, revenue }) => ({ month, year, revenue }))
            }));
        });

        // Fetch Projects
        const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('userId', '==', user.uid)), (snapshot) => {
            setStats(prev => ({ ...prev, activeProjects: snapshot.size }));
        });

        // Fetch Clients
        const unsubClients = onSnapshot(query(collection(db, 'clients'), where('userId', '==', user.uid)), (snapshot) => {
            setStats(prev => ({ ...prev, totalClients: snapshot.size }));
        });

        // Recent Activity logic
        const qInvoices = query(collection(db, 'invoices'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(5));
        const unsubActivities = onSnapshot(qInvoices, (snapshot) => {
            const activities: ActivityItem[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: data.paymentStatus === 'Paid' ? 'invoice_paid' : 'invoice_sent',
                    title: `Invoice ${data.invoiceId} ${data.paymentStatus === 'Paid' ? 'Paid' : 'Updated'}`,
                    subtitle: `${data.projectName} - $${(data.amountDue || 0).toFixed(2)}`,
                    timestamp: data.updatedAt || new Date().toISOString(),
                    amount: data.amountDue
                };
            });
            setRecentActivity(activities);
        });

        return () => {
            unsubInvoices();
            unsubProjects();
            unsubClients();
            unsubActivities();
        };
    }, [timeframe]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(val);
    };

    const getTimeAgo = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen p-8 lg:pl-80">
            {/* Header Section */}
            <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                        <LayoutDashboard className="w-8 h-8 text-blue-600" />
                        <h1 className="text-slate-900 text-4xl font-black leading-tight tracking-tight">Dashboard</h1>
                    </div>
                    <p className="text-slate-500 text-base font-normal">Welcome back. Here's your financial performance at a glance.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center justify-center rounded-xl h-12 px-6 bg-white border border-slate-200 text-slate-900 font-bold text-sm hover:bg-slate-50 transition-colors">
                        <Download className="w-4 h-4 mr-2" /> Export Report
                    </button>
                    <Link to="/invoices/new" className="flex items-center justify-center rounded-xl h-12 px-6 bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
                        <Plus className="w-4 h-4 mr-2" /> Create Invoice
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Main Content Area - Aligned to match the chart width below */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Total Revenue */}
                        <div className="flex flex-col gap-4 rounded-2xl p-6 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Revenue</p>
                                    <p className="text-slate-900 text-3xl font-black mt-2">{formatCurrency(stats.totalRevenue)}</p>
                                </div>
                                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${stats.revenueTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {stats.revenueTrend >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(stats.revenueTrend).toFixed(1)}%
                                </span>
                                <span className="text-slate-400 text-xs font-medium">vs last month</span>
                            </div>
                        </div>

                        {/* Pending Invoices */}
                        <div className="flex flex-col gap-4 rounded-2xl p-6 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Pending Amount</p>
                                    <p className="text-slate-900 text-3xl font-black mt-2">{formatCurrency(stats.pendingAmount)}</p>
                                </div>
                                <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${stats.pendingTrend <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {stats.pendingTrend <= 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5" />}
                                    {Math.abs(stats.pendingTrend).toFixed(1)}%
                                </span>
                                <span className="text-slate-400 text-xs font-medium">vs last month</span>
                            </div>
                        </div>

                        {/* Active Projects */}
                        <div className="flex flex-col gap-4 rounded-2xl p-6 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Active Projects</p>
                                    <p className="text-slate-900 text-3xl font-black mt-2">{stats.activeProjects}</p>
                                </div>
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-blue-600 text-xs font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                                    {stats.activeProjects} In progress
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Chart Visual - Deriving from real stats */}
                    <div className="flex flex-col gap-6 rounded-3xl p-8 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <h3 className="text-slate-900 text-xl font-bold tracking-tight">Historical Revenue</h3>
                            </div>
                            <div className="relative bg-slate-50 border border-slate-200 rounded-xl flex items-center hover:bg-slate-100 transition-colors">
                                <select
                                    className="appearance-none bg-transparent w-full h-full py-2 pl-4 pr-10 text-xs font-bold text-slate-600 focus:outline-none cursor-pointer"
                                    value={timeframe}
                                    onChange={(e) => setTimeframe(e.target.value as any)}
                                >
                                    <option value="1m">Last Month</option>
                                    <option value="3m">Last 3 Months</option>
                                    <option value="6m">Last 6 Months</option>
                                    <option value="1y">Last Year</option>
                                    <option value="all">All Time</option>
                                </select>
                                <div className="absolute right-4 pointer-events-none">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-slate-900 text-5xl font-black tracking-tighter">{formatCurrency(stats.totalRevenue)}</span>
                            <span className={`font-bold text-sm px-2 py-0.5 rounded-full ${stats.revenueTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {stats.revenueTrend >= 0 ? '+' : ''}{stats.revenueTrend.toFixed(1)}% from last period
                            </span>
                        </div>

                        <div className="relative h-64 w-full group mt-4">
                            {stats.monthlyData.length > 1 ? (
                                <div className="w-full h-full relative">
                                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                        <defs>
                                            <linearGradient id="lineChartGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#4338ca" stopOpacity="0.25" />
                                                <stop offset="100%" stopColor="#4338ca" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        {(() => {
                                            const maxRevenue = Math.max(...stats.monthlyData.map(d => d.revenue), 1000);
                                            const points = stats.monthlyData.map((d, i) => ({
                                                x: (i / (stats.monthlyData.length - 1)) * 100,
                                                y: 90 - (d.revenue / maxRevenue) * 80
                                            }));

                                            // Smooth Cubic Bezier Path with horizontal tangents
                                            let pathData = `M ${points[0].x} ${points[0].y}`;
                                            for (let i = 0; i < points.length - 1; i++) {
                                                const curr = points[i];
                                                const next = points[i + 1];
                                                const cpX = curr.x + (next.x - curr.x) / 2;
                                                pathData += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
                                            }

                                            const areaPath = `${pathData} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;

                                            return (
                                                <>
                                                    <path d={areaPath} fill="url(#lineChartGradient)" />
                                                    <path
                                                        d={pathData}
                                                        fill="none"
                                                        stroke="#312e81"
                                                        strokeWidth="1.0"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        className="drop-shadow-[0_8px_8px_rgba(49,46,129,0.15)]"
                                                    />
                                                </>
                                            );
                                        })()}
                                    </svg>

                                    {/* HTML Tooltip Overlays */}
                                    {(() => {
                                        const maxRevenue = Math.max(...stats.monthlyData.map(d => d.revenue), 1000);
                                        return stats.monthlyData.map((p, i) => {
                                            const xPercent = (i / (stats.monthlyData.length - 1)) * 100;
                                            const yPercent = 90 - (p.revenue / maxRevenue) * 80;
                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute group/dot cursor-pointer"
                                                    style={{
                                                        left: `${xPercent}%`,
                                                        top: `${yPercent}%`,
                                                        transform: 'translate(-50%, -50%)',
                                                        width: '20px',
                                                        height: '20px'
                                                    }}
                                                >
                                                    {/* Tooltip Popup */}
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/dot:opacity-100 transition-opacity z-10 w-max">
                                                        <div className="bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap">
                                                            {formatCurrency(p.revenue)}
                                                        </div>
                                                        {/* Tooltip Arrow */}
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 pointer-events-none"></div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}

                                    <div className="absolute bottom-[-30px] w-full flex justify-between px-0">
                                        {stats.monthlyData.map((data, i) => (
                                            <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {data.month}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 italic text-sm">
                                    Collect more data to see growth trends
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Side Panels */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    {/* Quick Actions */}
                    <div className="rounded-2xl p-6 bg-white border border-slate-200 shadow-sm transition-all hover:shadow-md">
                        <h3 className="text-slate-900 text-lg font-bold mb-6 tracking-tight">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => navigate('/invoices/new')}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all active:scale-95 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-100 transition-transform group-hover:scale-110">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">New Invoice</span>
                            </button>
                            <button
                                onClick={() => navigate('/clients')}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all active:scale-95 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100 transition-transform group-hover:scale-110">
                                    <UserPlus className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">Add Client</span>
                            </button>
                            <button
                                onClick={() => navigate('/projects')}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all active:scale-95 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-100 transition-transform group-hover:scale-110">
                                    <Briefcase className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">Project Brief</span>
                            </button>
                            <button
                                onClick={() => navigate('/settings')}
                                className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/30 hover:bg-slate-50 transition-all active:scale-95 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-600 flex items-center justify-center shadow-lg shadow-slate-100 transition-transform group-hover:scale-110">
                                    <SettingsIcon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">Settings</span>
                            </button>
                        </div>
                    </div>

                    {/* Recent Activity Feed */}
                    <div className="rounded-3xl p-8 bg-white border border-slate-200 shadow-sm flex-1">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Activity</h3>
                            <Link to="/invoices" className="text-blue-600 text-xs font-black hover:underline uppercase tracking-widest">View All</Link>
                        </div>
                        <div className="flex flex-col gap-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            {recentActivity.length > 0 ? recentActivity.map((activity) => (
                                <div key={activity.id} className="flex gap-4 relative z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm
                                        ${activity.type === 'invoice_paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                        {activity.type === 'invoice_paid' ? <CheckCircle2 className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-sm font-black text-slate-900 leading-tight">{activity.title}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">{activity.subtitle}</p>
                                        <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-widest flex items-center">
                                            <Clock className="w-3 h-3 mr-1" /> {getTimeAgo(activity.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-slate-400 text-sm italic text-center py-8">No recent activity found.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
