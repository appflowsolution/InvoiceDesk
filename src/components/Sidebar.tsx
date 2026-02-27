import React from 'react';
import { LayoutDashboard, FileText, Users, FolderKanban, BarChart3, Settings, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();

    return (
        <div className="w-64 bg-slate-900 h-screen text-slate-300 flex flex-col justify-between fixed top-0 left-0">
            <div>
                <div className="p-6">
                    <h1 className="text-white text-2xl font-bold tracking-tight">InvoiceDesk</h1>
                </div>
                <nav className="mt-6">
                    <NavLink to="/overview" className={({ isActive }) => `flex items-center px-6 py-3 transition-colors ${isActive ? 'bg-blue-900/40 text-blue-400 border-r-4 border-blue-500 hover:bg-slate-800' : 'hover:bg-slate-800'}`}>
                        <LayoutDashboard className="w-5 h-5 mr-3" />
                        <span className="font-medium">Overview</span>
                    </NavLink>
                    <NavLink to="/invoices/new" className={({ isActive }) => `flex items-center px-6 py-3 transition-colors ${isActive ? 'bg-blue-900/40 text-blue-400 border-r-4 border-blue-500 hover:bg-slate-800' : 'hover:bg-slate-800'}`}>
                        <FileText className="w-5 h-5 mr-3" />
                        <span className="font-medium">Invoices</span>
                    </NavLink>
                    <NavLink to="/clients" className={({ isActive }) => `flex items-center px-6 py-3 transition-colors ${isActive ? 'bg-blue-900/40 text-blue-400 border-r-4 border-blue-500 hover:bg-slate-800' : 'hover:bg-slate-800'}`}>
                        <Users className="w-5 h-5 mr-3" />
                        <span className="font-medium">Clients</span>
                    </NavLink>
                    <NavLink to="/projects" className={({ isActive }) => `flex items-center px-6 py-3 transition-colors ${isActive ? 'bg-blue-900/40 text-blue-400 border-r-4 border-blue-500 hover:bg-slate-800' : 'hover:bg-slate-800'}`}>
                        <FolderKanban className="w-5 h-5 mr-3" />
                        <span className="font-medium">Projects</span>
                    </NavLink>
                    <NavLink to="/reports" className={({ isActive }) => `flex items-center px-6 py-3 transition-colors ${isActive ? 'bg-blue-900/40 text-blue-400 border-r-4 border-blue-500 hover:bg-slate-800' : 'hover:bg-slate-800'}`}>
                        <BarChart3 className="w-5 h-5 mr-3" />
                        <span className="font-medium">Reports</span>
                    </NavLink>
                    <NavLink to="/settings" className={({ isActive }) => `flex items-center px-6 py-3 transition-colors ${isActive ? 'bg-blue-900/40 text-blue-400 border-r-4 border-blue-500 hover:bg-slate-800' : 'hover:bg-slate-800'}`}>
                        <Settings className="w-5 h-5 mr-3" />
                        <span className="font-medium">Settings</span>
                    </NavLink>
                </nav>
            </div>

            <div className="p-6 border-t border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold">
                            {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="ml-3 truncate max-w-[120px]">
                            <p className="text-sm font-medium text-white truncate" title={user?.email || 'User'}>
                                {user?.email?.split('@')[0] || 'User'}
                            </p>
                            <p className="text-xs text-slate-400">Premium Account</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        title="Sign out"
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-md hover:bg-slate-800"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
