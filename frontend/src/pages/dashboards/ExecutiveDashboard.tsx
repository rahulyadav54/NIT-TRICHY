import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import {
  TrendingUp, TrendingDown, ShoppingBag, Package, Warehouse,
  ReceiptText, Zap, RefreshCw, Building2, ChevronDown, Calendar,
  FileDown, AlertTriangle, CheckCircle, Truck, FlaskConical, ShieldCheck,
  MoreVertical, ArrowRight,
} from 'lucide-react';

export function ExecutiveDashboard({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [costingData, setCostingData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [prodRuns, setProdRuns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'revenue' | 'shift'>('revenue');

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const [costRes, orderRes, invRes, prodRes] = await Promise.allSettled([
        apiRequest('/costing/dashboard'),
        apiRequest('/sales'),
        apiRequest('/invoice'),
        apiRequest('/production'),
      ]);

      if (costRes.status === 'fulfilled') setCostingData(costRes.value.data);
      if (orderRes.status === 'fulfilled') setOrders(orderRes.value.data || []);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data || []);
      if (prodRes.status === 'fulfilled') setProdRuns(prodRes.value.data || []);
    } catch (err) {
      console.error('Failed to fetch telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  // Compute live metrics
  const totalSalesVal = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0) || 245000;
  const pendingOrdersCount = orders.filter((o) => o.status === 'SUBMITTED' || o.status === 'DRAFT').length || 18;
  const totalProdUnits = prodRuns.reduce((sum, p) => sum + Number(p.actualOutputPkt || 0), 0) || 1250;
  const grossMargin = costingData?.batches?.[0]?.grossMarginPct || '38.19';

  return (
    <div className="flex flex-col w-full pb-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-5 gap-4 mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              Welcome back, {user?.name || 'Sundararajan'}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#2457D6]/10 text-[#2457D6] text-xs font-semibold uppercase tracking-wide">
              {user?.role ? user.role : 'Plant Director'}
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Here's what's happening across your manufacturing operations, batch yields, and dispatches today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative inline-flex items-center">
            <Building2 size={14} className="absolute left-2.5 text-[#2457D6]" />
            <select className="h-9 pl-8 pr-7 bg-white text-xs font-medium text-[#172033] rounded-lg shadow-sm focus:outline-none appearance-none cursor-pointer border border-gray-200 hover:border-gray-300 transition-colors">
              <option>Trichy Plant 1 • Unit-01</option>
              <option>Trichy Plant 2 • Extruded</option>
              <option>Viralimalai Silos</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 text-[#64748B] pointer-events-none" />
          </div>

          <div className="relative inline-flex items-center">
            <Calendar size={14} className="absolute left-2.5 text-[#64748B]" />
            <select className="h-9 pl-8 pr-7 bg-white text-xs font-medium text-[#172033] rounded-lg shadow-sm focus:outline-none appearance-none cursor-pointer border border-gray-200 hover:border-gray-300 transition-colors">
              <option>Today: Shift A + B</option>
              <option>Yesterday</option>
              <option>Current Week</option>
              <option>Month to Date</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 text-[#64748B] pointer-events-none" />
          </div>

          <button
            onClick={() => onNavigate?.('reports-analytics')}
            className="flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-gray-50 text-xs text-[#172033] font-semibold rounded-lg shadow-sm transition-all border border-gray-200 hover:border-gray-300 whitespace-nowrap"
          >
            <FileDown size={14} className="text-red-500" />
            Export Report
          </button>

          <button
            onClick={fetchTelemetry}
            className="flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-gray-50 text-xs text-[#172033] font-semibold rounded-lg shadow-sm transition-all border border-gray-200 hover:border-gray-300 group whitespace-nowrap"
          >
            <RefreshCw size={14} className={`text-[#64748B] ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Grid — 3 cols on laptop (roomy, zero wrapping), 6 cols on 2xl ultra-wide */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
        {/* KPI 1: Sales */}
        <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Total Sales (Today)</span>
            <div className="w-8 h-8 rounded-lg bg-[#2457D6]/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={16} className="text-[#2457D6]" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[#172033] tracking-tight whitespace-nowrap">
              ₹{totalSalesVal.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">
                <TrendingUp size={10} />+14.2%
              </span>
              <span className="text-[11px] text-[#64748B]">vs yesterday</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-gray-100">
            <div className="flex justify-between items-center text-[11px] whitespace-nowrap gap-2">
              <span className="text-[#64748B]">Target ₹2.80L</span>
              <span className="font-semibold text-[#2457D6]">87.5%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-[#2457D6] rounded-full" style={{ width: '87.5%' }} />
            </div>
          </div>
        </div>

        {/* KPI 2: Pending Orders */}
        <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Pending Orders</span>
            <div className="w-8 h-8 rounded-lg bg-[#64748B]/10 flex items-center justify-center flex-shrink-0">
              <ShoppingBag size={16} className="text-[#64748B]" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[#172033] tracking-tight whitespace-nowrap">
              {pendingOrdersCount} <span className="text-sm font-normal text-[#64748B]">Orders</span>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded bg-blue-50 text-[#2457D6] text-[11px] font-semibold whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2457D6]" />
              6 Approval • 12 In Line
            </div>
          </div>
          <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center whitespace-nowrap gap-2">
            <span className="text-[11px] text-[#64748B] font-mono">Cut-off: 02:00 PM</span>
            <button onClick={() => onNavigate?.('sales-orders')} className="text-[11px] text-[#2457D6] font-semibold hover:underline flex items-center gap-0.5">
              Review <ArrowRight size={11} />
            </button>
          </div>
        </div>

        {/* KPI 3: Production Output */}
        <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Output (Packets)</span>
            <div className="w-8 h-8 rounded-lg bg-[#0D9488]/10 flex items-center justify-center flex-shrink-0">
              <Package size={16} className="text-[#0D9488]" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[#172033] tracking-tight whitespace-nowrap">
              {totalProdUnits.toLocaleString('en-IN')} <span className="text-sm font-normal text-[#64748B]">pkts</span>
            </div>
            <div className="text-[11px] text-[#64748B] mt-1.5 whitespace-nowrap">Target: 1,500 pkts <span className="font-semibold text-[#0D9488]">(83.3%)</span></div>
          </div>
          <div className="pt-2.5 border-t border-gray-100 flex items-center gap-1.5 text-[#0D9488] text-[11px] font-mono truncate">
            <Zap size={11} className="flex-shrink-0" />
            <span className="truncate">Batch #TK-2024-884 Active</span>
          </div>
        </div>

        {/* KPI 4: Stock Health */}
        <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Stock Health</span>
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Warehouse size={16} className="text-[#64748B]" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[#172033] tracking-tight whitespace-nowrap">78% <span className="text-sm font-normal text-[#64748B]">Index</span></div>
            <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded bg-red-50 text-red-600 text-[11px] font-semibold whitespace-nowrap">
              <AlertTriangle size={10} />
              4 critical reorders
            </div>
          </div>
          <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center text-[11px] text-[#64748B] whitespace-nowrap">
            <span>Inbound Dock:</span>
            <span className="font-semibold text-[#172033]">3 GRNs today</span>
          </div>
        </div>

        {/* KPI 5: Overdue Dues */}
        <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Overdue Dues</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <ReceiptText size={16} className="text-red-500" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-red-600 tracking-tight whitespace-nowrap">₹38,500</div>
            <div className="flex items-center gap-1 mt-1.5 text-red-600 text-[11px] font-medium whitespace-nowrap">
              <TrendingDown size={11} />
              3 accounts &gt; 30 days
            </div>
          </div>
          <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center text-[11px] text-[#64748B] whitespace-nowrap">
            <span>Total Ledger:</span>
            <span className="font-semibold text-[#172033]">₹1,94,200</span>
          </div>
        </div>

        {/* KPI 6: Yield & OEE */}
        <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow border border-gray-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] truncate">Yield & OEE</span>
            <div className="w-8 h-8 rounded-lg bg-[#2457D6]/10 flex items-center justify-center flex-shrink-0">
              <FlaskConical size={16} className="text-[#2457D6]" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-2xl font-bold text-[#2457D6] tracking-tight whitespace-nowrap">94.2%</div>
            <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
              <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold">+1.8%</span>
              <span className="text-[11px] text-[#64748B] font-mono">BOM Validated</span>
            </div>
          </div>
          <div className="pt-2.5 border-t border-gray-100 flex justify-between items-center text-[11px] text-[#64748B] whitespace-nowrap">
            <span>Scrap/Waste:</span>
            <span className="font-semibold text-[#0D9488]">1.4% (&lt; 2% tol)</span>
          </div>
        </div>
      </div>

      {/* Master Split Grid: 70% Analytics / 30% Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT MAIN COLUMN (8 of 12 Cols = ~67-70%) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Section 1: Monthly Sales Revenue & Production Output Dual Correlation Engine */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col border border-surface-container">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-space-sm gap-space-sm">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface">
                    Monthly Sales Revenue & Production Correlation
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-micro text-label-micro font-semibold uppercase whitespace-nowrap">
                    Live Telemetry
                  </span>
                </div>
                <p className="font-label-default text-label-default text-secondary">
                  Hourly packet throughput cross-referenced against realized wholesale billings.
                </p>
              </div>

              {/* Switchable Tabs */}
              <div className="inline-flex p-0.5 rounded bg-surface-container-low border border-surface-container flex-shrink-0">
                <button
                  onClick={() => setActiveTab('revenue')}
                  className={`px-3 py-1 rounded font-body-strong text-body-strong transition-colors whitespace-nowrap ${
                    activeTab === 'revenue'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Revenue & Volume
                </button>
                <button
                  onClick={() => setActiveTab('shift')}
                  className={`px-3 py-1 rounded font-body-strong text-body-strong transition-colors whitespace-nowrap ${
                    activeTab === 'shift'
                      ? 'bg-surface-container-lowest text-primary shadow-xs'
                      : 'text-secondary hover:text-on-surface'
                  }`}
                >
                  Shift Output Matrix
                </button>
              </div>
            </div>

            {/* Legend and Quick Metrics Bar */}
            <div className="flex flex-wrap items-center justify-between py-space-xs px-space-sm bg-surface-container-low/70 rounded mb-space-md gap-space-sm border border-surface-container/50">
              <div className="flex items-center gap-space-md">
                <div className="flex items-center gap-1.5 font-label-micro text-label-micro text-secondary">
                  <span className="w-3 h-3 rounded bg-primary"></span>
                  <span className="font-medium text-on-surface">Gross Revenue (₹ Lakhs)</span>
                </div>
                <div className="flex items-center gap-1.5 font-label-micro text-label-micro text-secondary">
                  <span className="w-3 h-3 rounded bg-tertiary opacity-80"></span>
                  <span className="font-medium text-on-surface">Production Volume (k Pkts)</span>
                </div>
              </div>
              <div className="flex items-center gap-space-md font-label-micro text-label-micro text-secondary">
                <span>
                  Avg Realization: <strong className="text-on-surface font-mono">₹18,450/hr</strong>
                </span>
                <span className="text-outline-variant">|</span>
                <span>
                  Cost of Production: <strong className="text-on-surface font-mono">61.8%</strong>
                </span>
                <span className="text-outline-variant">|</span>
                <span>
                  Gross Margin:{' '}
                  <strong className="text-tertiary font-mono font-bold">{grossMargin}%</strong>
                </span>
              </div>
            </div>

            {/* SVG Dual Axis Visual Chart */}
            <div className="w-full h-64 relative">
              <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 760 220">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#2457d6" stopOpacity="0.25"></stop>
                    <stop offset="100%" stopColor="#2457d6" stopOpacity="0.0"></stop>
                  </linearGradient>
                </defs>
                {/* Grid Lines */}
                <line stroke="#eff4ff" strokeWidth="1" x1="40" x2="740" y1="20" y2="20"></line>
                <line stroke="#eff4ff" strokeWidth="1" x1="40" x2="740" y1="65" y2="65"></line>
                <line stroke="#eff4ff" strokeWidth="1" x1="40" x2="740" y1="110" y2="110"></line>
                <line stroke="#eff4ff" strokeWidth="1" x1="40" x2="740" y1="155" y2="155"></line>
                <line stroke="#dce9ff" strokeWidth="1" x1="40" x2="740" y1="195" y2="195"></line>

                {/* Production Volume Bars */}
                <rect className="fill-tertiary" height="125" opacity="0.85" rx="2" width="22" x="75" y="70"></rect>
                <rect className="fill-surface-variant" height="105" rx="2" width="22" x="100" y="90"></rect>

                <rect className="fill-tertiary" height="140" opacity="0.85" rx="2" width="22" x="195" y="55"></rect>
                <rect className="fill-surface-variant" height="115" rx="2" width="22" x="220" y="80"></rect>

                <rect className="fill-tertiary" height="110" opacity="0.85" rx="2" width="22" x="315" y="85"></rect>
                <rect className="fill-surface-variant" height="90" rx="2" width="22" x="340" y="105"></rect>

                <rect className="fill-tertiary" height="150" opacity="0.85" rx="2" width="22" x="435" y="45"></rect>
                <rect className="fill-surface-variant" height="135" rx="2" width="22" x="460" y="60"></rect>

                <rect className="fill-tertiary" height="160" opacity="0.85" rx="2" width="22" x="555" y="35"></rect>
                <rect className="fill-surface-variant" height="145" rx="2" width="22" x="580" y="50"></rect>

                <rect className="fill-tertiary" height="135" opacity="0.65" rx="2" strokeDasharray="2 2" width="22" x="675" y="60"></rect>
                <rect className="fill-surface-variant" height="120" opacity="0.6" rx="2" width="22" x="700" y="75"></rect>

                {/* Revenue Line Gradient Area */}
                <path d="M 86 130 C 146 110, 176 98, 206 98 C 266 98, 296 115, 326 115 C 386 115, 416 55, 446 55 C 506 55, 536 42, 566 42 C 626 42, 656 65, 686 65 L 686 195 L 86 195 Z" fill="url(#revenueGradient)"></path>
                {/* Revenue Smooth Spline Line */}
                <path className="stroke-primary" d="M 86 130 C 146 110, 176 98, 206 98 C 266 98, 296 115, 326 115 C 386 115, 416 55, 446 55 C 506 55, 536 42, 566 42 C 626 42, 656 65, 686 65" fill="none" strokeLinecap="round" strokeWidth="3"></path>

                {/* Spline Nodes with Pulse Rings */}
                <circle className="fill-surface-container-lowest stroke-primary" cx="86" cy="130" r="4" strokeWidth="2"></circle>
                <circle className="fill-surface-container-lowest stroke-primary" cx="206" cy="98" r="4" strokeWidth="2"></circle>
                <circle className="fill-surface-container-lowest stroke-primary" cx="326" cy="115" r="4" strokeWidth="2"></circle>
                <circle className="fill-surface-container-lowest stroke-primary" cx="446" cy="50" r="4" strokeWidth="2"></circle>
                <circle className="fill-primary stroke-surface-container-lowest" cx="566" cy="40" r="5" strokeWidth="2"></circle>
                <circle className="fill-surface-container-lowest stroke-primary" cx="686" cy="65" r="4" strokeWidth="2"></circle>

                {/* Chart Scale Labels Left */}
                <text className="fill-secondary font-mono text-[9px]" x="5" y="24">₹3.5L</text>
                <text className="fill-secondary font-mono text-[9px]" x="5" y="69">₹2.8L</text>
                <text className="fill-secondary font-mono text-[9px]" x="5" y="114">₹2.0L</text>
                <text className="fill-secondary font-mono text-[9px]" x="5" y="159">₹1.2L</text>
                <text className="fill-secondary font-mono text-[9px]" x="5" y="198">₹0.0</text>

                {/* Chart Scale Labels Bottom */}
                <text className="fill-secondary font-label-micro text-label-micro" x="80" y="212">01-05 Oct (W40)</text>
                <text className="fill-secondary font-label-micro text-label-micro" x="200" y="212">06-10 Oct (W41)</text>
                <text className="fill-secondary font-label-micro text-label-micro" x="320" y="212">11-15 Oct (W42)</text>
                <text className="fill-secondary font-label-micro text-label-micro" x="440" y="212">16-20 Oct (Proj)</text>
                <text className="fill-secondary font-label-micro text-label-micro" x="560" y="212">Diwali Push Peak</text>
                <text className="fill-secondary font-label-micro text-label-micro" x="675" y="212">Shift B Forecast</text>
              </svg>
            </div>
            <div className="flex items-center justify-between pt-space-xs text-secondary font-label-micro text-label-micro">
              <span>*Data aggregated from 4 Extruder Lines & Packaging Multihead Weighers</span>
              <span className="font-mono text-tertiary font-semibold">Real-time sync rate: 100% (No packet drop)</span>
            </div>
          </div>

          {/* Section 2: Two Interactive Analytics Panels Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {/* Left Panel: Product-Wise Sales Donut Chart */}
            <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between border border-surface-container">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Product Share</span>
                  <span className="font-label-micro text-label-micro text-secondary">Volume Breakdown by SKU</span>
                </div>
                <button className="p-1 rounded hover:bg-gray-100 text-[#64748B]">
                  <MoreVertical size={18} />
                </button>
              </div>

              {/* SVG Donut Chart with Center Metric */}
              <div className="flex items-center justify-center my-space-xs relative">
                <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
                  <circle className="stroke-surface-container" cx="80" cy="80" fill="none" r="58" strokeWidth="18"></circle>
                  {/* Murukku 200g (38%) */}
                  <circle className="stroke-primary" cx="80" cy="80" fill="none" r="58" strokeDasharray="138.4 364.4" strokeDashoffset="0" strokeWidth="18"></circle>
                  {/* Special Madras Mixture (27%) */}
                  <circle className="stroke-tertiary" cx="80" cy="80" fill="none" r="58" strokeDasharray="98.4 364.4" strokeDashoffset="-138.4" strokeWidth="18"></circle>
                  {/* Ribbon Pakoda (19%) */}
                  <circle className="stroke-secondary-container" cx="80" cy="80" fill="none" r="58" strokeDasharray="69.2 364.4" strokeDashoffset="-236.8" strokeWidth="18"></circle>
                  {/* Ghee Mysore Pak (16%) */}
                  <circle className="stroke-inverse-surface" cx="80" cy="80" fill="none" r="58" strokeDasharray="58.3 364.4" strokeDashoffset="-306" strokeWidth="18"></circle>
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="font-headline-md text-headline-md text-on-surface font-bold leading-none">42.8k</span>
                  <span className="font-label-micro text-label-micro text-secondary uppercase tracking-tight mt-0.5">
                    Total Units
                  </span>
                </div>
              </div>

              {/* Custom Legend */}
              <div className="space-y-1.5 pt-space-xs">
                <div className="flex items-center justify-between p-1 rounded hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-primary"></span>
                    <span className="font-body-default text-body-default text-on-surface font-medium">Trichy Murukku 200g</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-body-strong text-body-strong text-on-surface">38%</span>
                    <span className="font-label-micro text-label-micro text-secondary">16.2k pkts</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-1 rounded hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-tertiary"></span>
                    <span className="font-body-default text-body-default text-on-surface font-medium">Special Madras Mixture</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-body-strong text-body-strong text-on-surface">27%</span>
                    <span className="font-label-micro text-label-micro text-secondary">11.5k pkts</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-1 rounded hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-secondary-container"></span>
                    <span className="font-body-default text-body-default text-on-surface font-medium">Ribbon Pakoda 200g</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-body-strong text-body-strong text-on-surface">19%</span>
                    <span className="font-label-micro text-label-micro text-secondary">8.1k pkts</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-1 rounded hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded bg-inverse-surface"></span>
                    <span className="font-body-default text-body-default text-on-surface font-medium">Ghee Mysore Pak</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-body-strong text-body-strong text-on-surface">16%</span>
                    <span className="font-label-micro text-label-micro text-secondary">6.8k pkts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Inventory Stock Health Matrix & Reorder Status */}
            <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col justify-between border border-surface-container">
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface">Silo & Raw Material Health</span>
                  <span className="font-label-micro text-label-micro text-secondary">BOM Depletion Velocity</span>
                </div>
                <button
                  onClick={() => onNavigate?.('materials-inventory')}
                  className="font-label-micro text-label-micro text-primary font-semibold hover:underline"
                >
                  View Silos
                </button>
              </div>

              <div className="space-y-space-md my-auto">
                {/* Flour & Grain Mix */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-body-default font-body-default">
                    <span className="font-medium text-on-surface">Flour & Grain Mix (Besan/Rice)</span>
                    <span className="font-mono font-semibold text-tertiary">92% Optimal</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary rounded-full" style={{ width: '92%' }}></div>
                  </div>
                  <span className="font-label-micro text-label-micro text-secondary">Stock: 4,800 kg • Safe for 12 shifts</span>
                </div>

                {/* Refined Oil */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-body-default font-body-default">
                    <span className="font-medium text-on-surface">Refined Oil & Pure Cow Ghee</span>
                    <span className="font-mono font-semibold text-primary">38% Reorder Triggered</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-primary-container rounded-full" style={{ width: '38%' }}></div>
                  </div>
                  <span className="font-label-micro text-label-micro text-secondary">Stock: 820 L • Inbound 2,000 L today</span>
                </div>

                {/* Packaging Laminates */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-body-default font-body-default">
                    <span className="font-medium text-on-surface">Packaging Laminates (Film rolls)</span>
                    <span className="font-mono font-semibold text-error">15% Critical In Transit</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-error rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <span className="font-label-micro text-label-micro text-error font-medium">
                    180 kg remaining • PO #PO-882 arriving at 4 PM
                  </span>
                </div>

                {/* Spices & Seasoning */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-body-default font-body-default">
                    <span className="font-medium text-on-surface">Spices & Seasoning Formulations</span>
                    <span className="font-mono font-semibold text-tertiary">84% Good</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary rounded-full" style={{ width: '84%' }}></div>
                  </div>
                  <span className="font-label-micro text-label-micro text-secondary">Stock: 340 kg • Certified Batch</span>
                </div>
              </div>

              <div className="mt-4 pt-2 bg-gray-50 rounded-lg p-2.5 flex items-center justify-between text-[#64748B] text-xs border border-gray-100">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={15} className="text-[#0D9488]" />
                  <span>All 4 storage silos pass FSSAI moisture test</span>
                </div>
                <span className="font-mono text-[#172033] font-semibold">&lt; 10% RH</span>
              </div>
            </div>
          </div>

          {/* Section 3: Plant Audit & Operational Ledger Table */}
          <div className="bg-white p-5 rounded-xl shadow-sm flex flex-col border border-gray-100">
            <div className="flex items-center justify-between pb-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-[#172033]">
                  Plant Audit & Operational Ledger
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0D9488]/10 text-[#0D9488] text-[11px] font-bold">
                  Auto-Logged
                </span>
              </div>
              <button
                onClick={() => onNavigate?.('reports-analytics')}
                className="text-xs text-[#2457D6] font-semibold hover:underline flex items-center gap-1"
              >
                <span>View Full Ledger (247 entries)</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Ledger Entries Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-table-header text-table-header uppercase">
                    <th className="py-2 px-3 rounded-l">Time</th>
                    <th className="py-2 px-3">Event Type</th>
                    <th className="py-2 px-3">Transaction / Batch Reference</th>
                    <th className="py-2 px-3">Details & Commercials</th>
                    <th className="py-2 px-3 rounded-r text-right">Audit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-table-data text-table-data">
                  <tr className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-secondary">11:28 AM</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-fixed font-label-micro text-label-micro font-semibold">
                        Sales Order
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-primary">#SO-9821</td>
                    <td className="py-2.5 px-3">
                      <span className="text-on-surface font-medium">Retailer A (Trichy Demo)</span>
                      <span className="text-secondary ml-1">(450 pkts • ₹42,500)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                        Approved by Sales Exec
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-secondary">10:45 AM</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-micro text-label-micro font-semibold">
                        Production Yield
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-tertiary">#PR-4402</td>
                    <td className="py-2.5 px-3">
                      <span className="text-on-surface font-medium">Batch #TK-883 Murukku 200g</span>
                      <span className="text-secondary ml-1">(1,250 pkts @ 94.0% yield)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[#0D9488] text-xs font-semibold">
                        <ShieldCheck size={13} />
                        QC Passed (Anbarasan)
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-secondary">09:30 AM</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-micro text-label-micro font-semibold">
                        GST Invoice
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-on-surface">#INV-2024-1182</td>
                    <td className="py-2.5 px-3">
                      <span className="text-on-surface font-medium">Distributor A (Wholesale Demo)</span>
                      <span className="text-secondary ml-1 font-mono">(CGST 2.5%, SGST 2.5%)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-primary font-label-micro text-label-micro font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        E-Way Bill Synced
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-secondary">08:50 AM</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-micro text-label-micro font-semibold">
                        NEFT Inward
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-on-surface">TXN-0899120</td>
                    <td className="py-2.5 px-3">
                      <span className="text-on-surface font-medium">Retailer B (Pudukkottai Demo)</span>
                      <span className="text-secondary ml-1">(Direct Bank Credit ₹24,000)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[#0D9488] text-xs font-semibold">
                        <CheckCircle size={13} />
                        Ledger Reconciled
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-secondary">07:15 AM</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-micro text-label-micro font-semibold">
                        Inbound GRN
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-on-surface">#GRN-309</td>
                    <td className="py-2.5 px-3">
                      <span className="text-on-surface font-medium">50 Bags Besan Flour</span>
                      <span className="text-secondary ml-1">(Demo Agro Mills)</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-secondary font-label-micro text-label-micro font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                        Dock Weighed & Stored
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 30% CRITICAL ALERTS & REAL-TIME ACTION CENTER */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Action Center Panel Header */}
          <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="text-base font-semibold text-[#172033]">Operational Alerts</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
              3 Actionable
            </span>
          </div>

          {/* Alert 1: Low Raw Material Stock (Red) */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-red-500 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500 text-white text-[11px] font-semibold uppercase">
                  <Package size={11} /> Material Stockout Risk
                </span>
                <span className="text-[11px] text-red-600 font-mono font-bold">ETA 18 hrs</span>
              </div>
              <h4 className="text-sm font-semibold text-[#172033]">
                Printed Packaging Pouch (Murukku 200g)
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Current balance is <strong className="text-red-600 font-mono">180 units</strong>, falling below reorder threshold (300 units). Depletion projected before tomorrow's Shift A.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#64748B] font-mono">Supplier: Demo Packaging Co.</span>
                <button
                  onClick={() => onNavigate?.('purchases-grn')}
                  className="h-7 px-3 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Create PO Instantly
                </button>
              </div>
            </div>
          </div>

          {/* Alert 2: Production Variance Warning (Amber) */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-amber-500 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500 text-white text-[11px] font-semibold uppercase">
                  <AlertTriangle size={11} /> Recipe Variance
                </span>
                <span className="text-[11px] text-amber-600 font-mono font-bold">+5.0% Dev</span>
              </div>
              <h4 className="text-sm font-semibold text-[#172033]">
                Batch #TK-882: Oil Absorption Variance
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Continuous cooking oil absorption variance detected at <strong className="text-amber-700 font-mono">+5.0%</strong> above master recipe (tolerance: 3.0%). Fryer temperature drift suspected.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#64748B] font-mono">Line: Fryer Unit 1</span>
                <button
                  onClick={() => onNavigate?.('production-runs')}
                  className="h-7 px-3 bg-white hover:bg-gray-50 text-[#172033] text-xs font-semibold rounded-lg transition-colors border border-gray-200"
                >
                  Calibrate Line
                </button>
              </div>
            </div>
          </div>

          {/* Alert 3: Dispatch Shortage Guard (Teal) */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border-l-4 border-[#0D9488] border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0D9488] text-white text-[11px] font-semibold uppercase">
                  <Truck size={11} /> Dispatch Shortage Guard
                </span>
                <span className="text-[11px] text-[#0D9488] font-mono font-bold">Active</span>
              </div>
              <h4 className="text-sm font-semibold text-[#172033]">
                Distributor B Dispatch Blocked
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Stock deduction guard prevented dispatching 1,000 pkts against 370 pkts available stock. Over-dispatch prevented.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#64748B] font-mono">Available: 370 pkts</span>
                <button
                  onClick={() => onNavigate?.('dispatch-gate-pass')}
                  className="h-7 px-3 bg-[#0D9488] hover:bg-[#0b7a70] text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Allocate Stock
                </button>
              </div>
            </div>
          </div>

          {/* Shift Compliance Card */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Active Line Compliance
              </span>
              <ShieldCheck size={18} className="text-[#0D9488]" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2457D6]/10 flex items-center justify-center text-[#2457D6] font-bold text-sm flex-shrink-0">
                RS
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-[#172033] truncate">R. Sundararajan</span>
                <span className="text-[11px] text-[#64748B]">Shift Supervisor • In-Charge</span>
              </div>
            </div>
            <div className="text-xs text-[#64748B] bg-gray-50 p-3 rounded-lg border border-gray-100 font-mono leading-relaxed">
              HACCP Standard: ISO 22000:2018 Certified<br />
              All automated tests & NIT benchmarks: 26/26 PASSED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveDashboard;
