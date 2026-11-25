import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, AlertTriangle, Factory, ClipboardList, Package,
  ArrowLeftRight, CheckCircle, ShoppingCart, Users, Truck, ShoppingBag,
  Store, FileText, Wallet, TrendingUp, BarChart2, Users2, Settings,
  Bell, Search, ChevronDown, LogOut, ChevronLeft, ChevronRight, Menu, X,
  Plus, Building2,
} from 'lucide-react';

export interface AppShellProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    section: 'CORE',
    items: [
      { path: 'overview', label: 'Overview / Dashboard', Icon: LayoutDashboard, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR', 'SALESMAN', 'ACCOUNTANT_AUDITOR'] },
      { path: 'alerts-action-center', label: 'Alerts & Action Center', Icon: AlertTriangle, badge: '4', badgeColor: 'bg-red-500 text-white', roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR'] },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      { path: 'production-runs', label: 'Production Runs', Icon: Factory, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR'] },
      { path: 'bom-recipes', label: 'BOM & Recipes', Icon: ClipboardList, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR'] },
      { path: 'materials-inventory', label: 'Materials & Inventory', Icon: Package, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT_AUDITOR'] },
      { path: 'stock-movement', label: 'Stock Movement', Icon: ArrowLeftRight, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT_AUDITOR'] },
      { path: 'quality-audit-trail', label: 'Quality & Audit Trail', Icon: CheckCircle, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT_AUDITOR'] },
    ],
  },
  {
    section: 'SUPPLY CHAIN',
    items: [
      { path: 'purchases-grn', label: 'Purchases & GRN', Icon: ShoppingCart, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR', 'ACCOUNTANT_AUDITOR'] },
      { path: 'suppliers-directory', label: 'Suppliers Directory', Icon: Users, roles: ['OWNER', 'ADMIN', 'PRODUCTION_SUPERVISOR'] },
      { path: 'dispatch-gate-pass', label: 'Dispatch & Gate Pass', Icon: Truck, roles: ['OWNER', 'ADMIN'] },
    ],
  },
  {
    section: 'COMMERCIAL & SALES',
    items: [
      { path: 'sales-orders', label: 'Sales & Orders', Icon: ShoppingBag, roles: ['OWNER', 'ADMIN', 'SALESMAN', 'ACCOUNTANT_AUDITOR'] },
      { path: 'customers', label: 'Retail & Wholesale Customers', Icon: Store, roles: ['OWNER', 'ADMIN', 'SALESMAN', 'ACCOUNTANT_AUDITOR'] },
      { path: 'gst-invoices-eway', label: 'GST Invoices & E-Way', Icon: FileText, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT_AUDITOR'] },
      { path: 'payments-receivables', label: 'Payments & Receivables', Icon: Wallet, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT_AUDITOR'] },
      { path: 'costing-margins', label: 'Costing & Margins', Icon: TrendingUp, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT_AUDITOR'] },
    ],
  },
  {
    section: 'ENTERPRISE',
    items: [
      { path: 'reports-analytics', label: 'Reports & Analytics', Icon: BarChart2, roles: ['OWNER', 'ADMIN', 'ACCOUNTANT_AUDITOR'] },
      { path: 'user-management', label: 'User Management', Icon: Users2, roles: ['OWNER', 'ADMIN'] },
      { path: 'plant-settings', label: 'Plant Settings', Icon: Settings, roles: ['OWNER', 'ADMIN'] },
    ],
  },
];

const BREADCRUMB_MAP: Record<string, string> = {
  overview: 'Overview',
  'alerts-action-center': 'Alerts & Action Center',
  'production-runs': 'Production Runs',
  'bom-recipes': 'BOM & Recipes',
  'materials-inventory': 'Materials & Inventory',
  'stock-movement': 'Stock Movement',
  'quality-audit-trail': 'Quality & Audit Trail',
  'purchases-grn': 'Purchases & GRN',
  'suppliers-directory': 'Suppliers Directory',
  'dispatch-gate-pass': 'Dispatch & Gate Pass',
  'sales-orders': 'Sales & Orders',
  customers: 'Customers',
  'gst-invoices-eway': 'GST Invoices & E-Way',
  'payments-receivables': 'Payments & Receivables',
  'costing-margins': 'Costing & Margins',
  'reports-analytics': 'Reports & Analytics',
  'user-management': 'User Management',
  'plant-settings': 'Plant Settings',
};

export function AppShell({ currentPath, onNavigate, children }: AppShellProps) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [welcomeBanner, setWelcomeBanner] = useState<{ name: string; role: string } | null>(() => {
    try {
      const raw = sessionStorage.getItem('trima_welcome_user');
      if (raw) {
        sessionStorage.removeItem('trima_welcome_user');
        return JSON.parse(raw);
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  });
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!welcomeBanner) return;
    const timer = setTimeout(() => setWelcomeBanner(null), 5000);
    return () => clearTimeout(timer);
  }, [welcomeBanner]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  const sidebarW = collapsed ? 72 : 250;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div
        className="flex items-center gap-3 px-4 border-b border-white/10"
        style={{ height: 64, minHeight: 64 }}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#2457D6] flex items-center justify-center shadow">
          <Factory size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-white font-bold text-sm leading-tight tracking-tight truncate">TRIMA ERP</span>
            <span className="text-[#64748B] text-[10px] font-medium uppercase tracking-wider truncate">
              Manufacturing & Audit
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1E293B transparent' }}>
        {NAV_ITEMS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !user?.role || item.roles.includes(user.role)
          );
          if (visibleItems.length === 0) return null;
          return (
          <div key={group.section}>
            {!collapsed && (
              <p className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#475569]">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5 px-2">
              {visibleItems.map(({ path, label, Icon, badge, badgeColor }) => {
                const isActive = currentPath === path;
                return (
                  <button
                    key={path}
                    onClick={() => handleNav(path)}
                    title={collapsed ? label : undefined}
                    className={`w-full flex items-center gap-3 rounded-lg transition-all text-left group relative ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'
                    } ${
                      isActive
                        ? 'bg-[#2457D6] text-white shadow-sm'
                        : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-white'
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-white'}`}
                    />
                    {!collapsed && (
                      <span className="text-[13px] font-medium truncate flex-1">{label}</span>
                    )}
                    {!collapsed && badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeColor}`}>
                        {badge}
                      </span>
                    )}
                    {collapsed && badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Bottom Status + User */}
      <div className="border-t border-white/10 p-3 space-y-2">
        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1E293B] ${collapsed ? 'justify-center' : ''}`}>
          <span className="w-2 h-2 rounded-full bg-[#0D9488] flex-shrink-0 animate-pulse" />
          {!collapsed && (
            <span className="text-[11px] text-[#64748B] font-medium truncate">MES & Audit: ONLINE</span>
          )}
        </div>
        {!collapsed && (
          <div className="flex items-center justify-between px-2 text-[11px]">
            <span className="text-[#475569]">Role: {user?.role || 'Guest'}</span>
            <span className="text-white font-semibold truncate max-w-[100px]">{user?.name || 'User'}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#F4F7FB' }}>
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-50 transition-[width] duration-300 ease-in-out"
        style={{ width: sidebarW, background: '#101B33' }}
      >
        <SidebarContent />

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-[#2457D6] border-2 border-[#101B33] flex items-center justify-center shadow-md hover:bg-[#1a3fa8] transition-colors z-10"
        >
          {collapsed
            ? <ChevronRight size={12} className="text-white" />
            : <ChevronLeft size={12} className="text-white" />
          }
        </button>
      </aside>

      {/* ─── MOBILE SIDEBAR OVERLAY ─── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex flex-col h-full z-10 shadow-2xl" style={{ width: 250, background: '#101B33' }}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 text-white z-10"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ─── MAIN WRAPPER ─── */}
      <div
        className={`flex flex-col min-h-screen transition-[padding-left] duration-300 ease-in-out ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[250px]'
        }`}
      >
        {/* ─── TOPBAR ─── */}
        <header
          className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 lg:px-6 bg-white border-b border-gray-200 shadow-sm"
          style={{ height: 64 }}
        >
          {/* Left: Mobile hamburger + Breadcrumb */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 flex-shrink-0"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 min-w-0 truncate">
              <span
                onClick={() => handleNav('overview')}
                className="hover:text-[#2457D6] cursor-pointer transition-colors whitespace-nowrap"
              >
                TRIMA ERP
              </span>
              <span className="text-gray-300">/</span>
              <span className="font-semibold text-[#172033] truncate">
                {BREADCRUMB_MAP[currentPath] || 'Overview'}
              </span>
            </div>

            {/* Plant selector (wide screens only so breadcrumb never clips) */}
            <div className="hidden 2xl:flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 cursor-pointer text-xs font-medium text-[#172033] ml-2 whitespace-nowrap flex-shrink-0">
              <Building2 size={13} className="text-[#2457D6]" />
              <span>Trichy Plant 1</span>
              <ChevronDown size={12} className="text-gray-500" />
            </div>
          </div>

          {/* Center: Search */}
          <div className="hidden md:flex relative items-center w-56 xl:w-72 flex-shrink-0">
            <Search size={15} className="absolute left-3 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter' || !searchTerm.trim()) return;
                const q = searchTerm.trim().toLowerCase();
                if (q.includes('so') || q.includes('order')) handleNav('sales-orders');
                else if (q.includes('inv') || q.includes('uf/') || q.includes('gst')) handleNav('gst-invoices-eway');
                else if (q.includes('po') || q.includes('grn')) handleNav('purchases-grn');
                else if (q.includes('batch') || q.includes('run') || q.includes('prod')) handleNav('production-runs');
                else handleNav('materials-inventory');
              }}
              placeholder="Search orders, materials, GSTIN..."
              className="w-full h-9 pl-9 pr-12 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2457D6]/30 focus:border-[#2457D6] text-[#172033] placeholder:text-gray-400 transition-all"
            />
            <span className="absolute right-2.5 text-[10px] font-mono text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </div>

          {/* Right: Actions + Profile */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Shift indicator */}
            <div className="hidden lg:flex items-center gap-1.5 h-8 px-3 rounded-full border border-[#0D9488]/30 bg-[#0D9488]/5 text-[11px] font-semibold text-[#0D9488] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488] animate-pulse" />
              Shift A • Active
            </div>

            {/* Date/Time */}
            <div className="hidden lg:flex flex-col text-right text-xs text-gray-500 leading-tight">
              <span className="font-semibold text-[#172033]">{currentDate || '—'}</span>
              <span>IST {currentTime || '—'}</span>
            </div>

            {/* Quick Action */}
            <button
              onClick={() => handleNav('sales-orders')}
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus size={15} />
              <span className="hidden lg:inline">Quick Action</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#172033] transition-colors"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 p-3 z-50 space-y-2 text-xs">
                  <div className="font-semibold text-[#172033] pb-1.5 border-b border-gray-100">Operational Alerts</div>
                  <button onClick={() => { setNotifOpen(false); handleNav('materials-inventory'); }} className="w-full text-left p-2 rounded-lg hover:bg-red-50 text-red-700">
                    <div className="font-semibold">Low Packaging Stock</div>
                    <div className="text-[11px] text-[#64748B]">Check reorder levels in Materials &amp; Inventory</div>
                  </button>
                  <button onClick={() => { setNotifOpen(false); handleNav('production-runs'); }} className="w-full text-left p-2 rounded-lg hover:bg-amber-50 text-amber-800">
                    <div className="font-semibold">Variance Monitor (±3%)</div>
                    <div className="text-[11px] text-[#64748B]">Inspect yield &amp; oil consumption in Production Runs</div>
                  </button>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-1 group focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#2457D6] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user?.name?.slice(0, 2).toUpperCase() || 'TR'}
                </div>
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-sm font-semibold text-[#172033] group-hover:text-[#2457D6] transition-colors truncate max-w-[120px]">
                    {user?.name || 'User'}
                  </span>
                  <span className="text-[11px] text-gray-500 truncate max-w-[120px]">
                    {user?.role || 'Guest'}
                  </span>
                </div>
                <ChevronDown size={14} className="hidden lg:block text-gray-400 group-hover:text-[#172033] transition-colors" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-[#172033]">{user?.name}</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{user?.role}</p>
                  </div>
                  <button
                    onClick={() => { logout(); setProfileOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── PAGE CONTENT ─── */}
        <main className="flex-1 p-4 lg:p-6 min-h-0 w-full max-w-[1600px] mx-auto">
          {welcomeBanner && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-gradient-to-r from-[#101B33] via-[#1B3A7A] to-[#2457D6] text-white shadow-md border border-blue-400/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-300/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={17} className="text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">
                    Welcome back, {welcomeBanner.name}!
                  </div>
                  <div className="text-xs text-blue-100/90 truncate">
                    Signed in as {welcomeBanner.role} • TRIMA ERP Trichy Plant 1 is live and ready.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setWelcomeBanner(null)}
                aria-label="Dismiss welcome message"
                className="p-1 rounded-lg hover:bg-white/10 text-blue-100 hover:text-white transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppShell;
