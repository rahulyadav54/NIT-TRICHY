import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Factory,
  FileText,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  TrendingUp,
  Truck,
  Users2,
  Wallet,
  WifiOff,
} from 'lucide-react';

interface OfflineQueuedOrder {
  localId: string;
  customerId: string;
  productId: string;
  qtyPackets: number;
  createdAt: string;
}

const OFFLINE_QUEUE_KEY = 'trima_offline_orders_queue_v1';

export function RolePortalDashboard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user } = useAuth();
  const role = user?.role || 'SALESMAN';

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pendingDispatches, setPendingDispatches] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [prodRuns, setProdRuns] = useState<any[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [costing, setCosting] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueuedOrder[]>([]);
  const [actionMsg, setActionMsg] = useState('');

  const loadPortalData = async () => {
    setLoading(true);
    try {
      try {
        const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
        setOfflineQueue(raw ? JSON.parse(raw) : []);
      } catch {
        setOfflineQueue([]);
      }

      if (role === 'ADMIN') {
        const [oRes, iRes, dRes, pRes] = await Promise.allSettled([
          apiRequest('/sales'),
          apiRequest('/invoice'),
          apiRequest('/dispatch/pending'),
          apiRequest('/purchase'),
        ]);
        if (oRes.status === 'fulfilled') setOrders(oRes.value.data || []);
        if (iRes.status === 'fulfilled') setInvoices(iRes.value.data || []);
        if (dRes.status === 'fulfilled') setPendingDispatches(dRes.value.data || []);
        if (pRes.status === 'fulfilled') setPurchases(pRes.value.data || []);
      } else if (role === 'PRODUCTION_SUPERVISOR') {
        const [prRes, stRes] = await Promise.allSettled([
          apiRequest('/production'),
          apiRequest('/master/materials'),
        ]);
        if (prRes.status === 'fulfilled') setProdRuns(prRes.value.data || []);
        if (stRes.status === 'fulfilled') {
          setStockItems((stRes.value.data || []).map((m: any) => ({ ...m, closingQty: m.currentStock ?? m.closingQty ?? 0 })));
        }
      } else if (role === 'SALESMAN') {
        const [oRes, cRes] = await Promise.allSettled([
          apiRequest('/sales'),
          apiRequest('/master/customers'),
        ]);
        if (oRes.status === 'fulfilled') setOrders(oRes.value.data || []);
        if (cRes.status === 'fulfilled') setCustomers(cRes.value.data || []);
      } else if (role === 'ACCOUNTANT_AUDITOR') {
        const [iRes, cRes, mRes] = await Promise.allSettled([
          apiRequest('/invoice'),
          apiRequest('/costing/dashboard'),
          apiRequest('/inventory/ledger'),
        ]);
        if (iRes.status === 'fulfilled') setInvoices(iRes.value.data || []);
        if (cRes.status === 'fulfilled') setCosting(cRes.value.data || null);
        if (mRes.status === 'fulfilled') setMovements(mRes.value.data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [role]);

  const handleQuickApprove = async (orderId: string) => {
    setActionMsg('');
    try {
      await apiRequest(`/sales/${orderId}/approve`, { method: 'POST', body: JSON.stringify({}) });
      setActionMsg('Order approved and ready for GST invoicing.');
      loadPortalData();
    } catch (err: any) {
      setActionMsg(err.message || 'Approval blocked (check finished goods stock).');
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 1. OPERATIONS ADMIN PORTAL
  // ───────────────────────────────────────────────────────────────────────────
  if (role === 'ADMIN') {
    const pendingOrders = orders.filter((o) => o.status === 'SUBMITTED' || o.status === 'DRAFT');
    const unpaidInvoices = invoices.filter((i) => Number(i.balanceDue || 0) > 0 && i.status !== 'CANCELLED');
    const totalReceivables = unpaidInvoices.reduce((s, i) => s + Number(i.balanceDue || 0), 0);

    return (
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#172033]">Operations Admin Control Center</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[#2457D6]/10 text-[#2457D6] text-xs font-semibold">ADMIN PORTAL</span>
            </div>
            <p className="text-sm text-[#64748B] mt-1">
              Order approvals, GST tax invoicing, gate-pass dispatch, receivables, and plant user administration.
            </p>
          </div>
          <button
            onClick={loadPortalData}
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-[#172033] hover:bg-gray-50 self-start"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Queue
          </button>
        </div>

        {actionMsg && (
          <div className="px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-[#1a3fa8] font-medium">
            {actionMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Orders Awaiting Approval</span>
              <ShoppingBag size={16} className="text-[#2457D6]" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">{pendingOrders.length}</div>
            <button onClick={() => onNavigate('sales-orders')} className="mt-3 text-xs font-semibold text-[#2457D6] inline-flex items-center gap-1 hover:underline">
              Open Order Queue <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Pending Gate-Pass Dispatch</span>
              <Truck size={16} className="text-[#0D9488]" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">{pendingDispatches.length}</div>
            <button onClick={() => onNavigate('dispatch-gate-pass')} className="mt-3 text-xs font-semibold text-[#0D9488] inline-flex items-center gap-1 hover:underline">
              Dispatch Stock <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Outstanding Receivables</span>
              <Wallet size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">Rs. {totalReceivables.toLocaleString('en-IN')}</div>
            <button onClick={() => onNavigate('payments-receivables')} className="mt-3 text-xs font-semibold text-amber-700 inline-flex items-center gap-1 hover:underline">
              Collect Payments <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Recent Purchase GRNs</span>
              <ShoppingCart size={16} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">{purchases.length}</div>
            <button onClick={() => onNavigate('purchases-grn')} className="mt-3 text-xs font-semibold text-indigo-600 inline-flex items-center gap-1 hover:underline">
              Manage GRNs <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#172033]">Sales Orders Requiring Admin Action</h2>
              <button onClick={() => onNavigate('sales-orders')} className="text-xs font-semibold text-[#2457D6] hover:underline">View All</button>
            </div>
            <div className="divide-y divide-gray-100">
              {pendingOrders.length > 0 ? pendingOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#172033] font-mono">{o.orderNumber}</div>
                    <div className="text-xs text-[#64748B]">{o.customer?.name || 'Customer'} • Rs. {Number(o.grandTotal || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickApprove(o.id)}
                      className="h-8 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onNavigate('sales-orders')}
                      className="h-8 px-3 rounded-lg border border-gray-200 text-xs font-semibold text-[#172033] hover:bg-gray-50"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-sm text-[#64748B]">All submitted sales orders have been processed.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="text-base font-semibold text-[#172033]">Admin Quick Modules</h2>
            <button onClick={() => onNavigate('gst-invoices-eway')} className="w-full p-3 rounded-lg border border-gray-200 hover:border-[#2457D6] hover:bg-blue-50/40 flex items-center justify-between text-sm font-medium text-[#172033]">
              <span className="flex items-center gap-2"><FileText size={16} className="text-[#2457D6]" /> GST Invoices & Credit Notes</span>
              <ArrowRight size={14} className="text-[#64748B]" />
            </button>
            <button onClick={() => onNavigate('user-management')} className="w-full p-3 rounded-lg border border-gray-200 hover:border-[#2457D6] hover:bg-blue-50/40 flex items-center justify-between text-sm font-medium text-[#172033]">
              <span className="flex items-center gap-2"><Users2 size={16} className="text-[#2457D6]" /> User Management & RBAC</span>
              <ArrowRight size={14} className="text-[#64748B]" />
            </button>
            <button onClick={() => onNavigate('plant-settings')} className="w-full p-3 rounded-lg border border-gray-200 hover:border-[#2457D6] hover:bg-blue-50/40 flex items-center justify-between text-sm font-medium text-[#172033]">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-[#0D9488]" /> Plant & GSTIN Settings</span>
              <ArrowRight size={14} className="text-[#64748B]" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PRODUCTION SUPERVISOR PORTAL
  // ───────────────────────────────────────────────────────────────────────────
  if (role === 'PRODUCTION_SUPERVISOR') {
    const varianceAlerts = prodRuns.filter((r) => Math.abs(Number(r.yieldVariancePct || 0)) > 3 || Math.abs(Number(r.oilVariancePct || 0)) > 3);
    const lowStock = stockItems.filter((s) => Number(s.closingQty || 0) <= Number(s.reorderLevel || 0));
    const totalGoodPkts = prodRuns.reduce((s, r) => s + Number(r.actualOutputPkt || 0), 0);

    return (
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#172033]">Production Floor & BOM Portal</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-[#0D9488] text-xs font-semibold">PRODUCTION SUPERVISOR</span>
            </div>
            <p className="text-sm text-[#64748B] mt-1">
              Live batch execution, ±3% yield &amp; oil consumption tolerance guard, raw material stock, and GRN intake.
            </p>
          </div>
          <button
            onClick={() => onNavigate('production-runs')}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-xs font-semibold self-start shadow-sm"
          >
            <Factory size={14} /> Record Production Batch
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Batches Executed</span>
              <Factory size={16} className="text-[#2457D6]" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">{prodRuns.length}</div>
            <div className="text-xs text-[#64748B] mt-2">Total Good Output: {totalGoodPkts.toLocaleString('en-IN')} pkts</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Variance Alerts (&gt; ±3%)</span>
              <AlertTriangle size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-3">{varianceAlerts.length}</div>
            <button onClick={() => onNavigate('production-runs')} className="mt-2 text-xs font-semibold text-[#2457D6] inline-flex items-center gap-1 hover:underline">
              Inspect Batches <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Low Stock Materials</span>
              <Package size={16} className="text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600 mt-3">{lowStock.length}</div>
            <button onClick={() => onNavigate('materials-inventory')} className="mt-2 text-xs font-semibold text-red-600 inline-flex items-center gap-1 hover:underline">
              Check Silos &amp; Packaging <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>BOM &amp; Recipe Scaling</span>
              <ClipboardCheck size={16} className="text-[#0D9488]" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">Active</div>
            <button onClick={() => onNavigate('bom-recipes')} className="mt-2 text-xs font-semibold text-[#0D9488] inline-flex items-center gap-1 hover:underline">
              Open BOM Calculator <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#172033]">Recent Batch Runs &amp; Variance Status</h2>
            <button onClick={() => onNavigate('stock-movement')} className="text-xs font-semibold text-[#2457D6] hover:underline">View Stock Ledger</button>
          </div>
          <div className="divide-y divide-gray-100">
            {prodRuns.length > 0 ? prodRuns.slice(0, 5).map((r) => (
              <div key={r.id} className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#172033] font-mono">{r.batchCode || r.id.slice(0, 8)}</div>
                  <div className="text-xs text-[#64748B]">Good: {r.actualOutputPkt} pkts • Expected: {r.expectedOutputPkt} pkts • Damaged: {r.damagedPouchCount}</div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded font-semibold ${Math.abs(Number(r.yieldVariancePct || 0)) > 3 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    Yield: {Number(r.yieldVariancePct || 0).toFixed(2)}%
                  </span>
                  <span className={`px-2 py-0.5 rounded font-semibold ${Math.abs(Number(r.oilVariancePct || 0)) > 3 ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
                    Oil: {Number(r.oilVariancePct || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-sm text-[#64748B]">No production runs logged yet. Record your first batch!</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. FIELD SALESMAN PORTAL (STRICTLY ROLE-ISOLATED)
  // ───────────────────────────────────────────────────────────────────────────
  if (role === 'SALESMAN') {
    const totalBooked = orders.reduce((s, o) => s + Number(o.grandTotal || 0), 0);

    return (
      <div className="space-y-6 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#172033]">Field Sales &amp; Order Capture Portal</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">FIELD SALESMAN</span>
            </div>
            <p className="text-sm text-[#64748B] mt-1">
              Mobile-ready order booking, offline queue with auto-sync, and your assigned retail/wholesale portfolio.
            </p>
          </div>
          <button
            onClick={() => onNavigate('sales-orders')}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-xs font-semibold self-start shadow-sm"
          >
            <ShoppingBag size={14} /> New Sales Order
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>My Booked Orders</span>
              <ShoppingBag size={16} className="text-[#2457D6]" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">{orders.length}</div>
            <button onClick={() => onNavigate('sales-orders')} className="mt-2 text-xs font-semibold text-[#2457D6] inline-flex items-center gap-1 hover:underline">
              Track Order Status <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>My Order Volume</span>
              <TrendingUp size={16} className="text-[#0D9488]" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">Rs. {totalBooked.toLocaleString('en-IN')}</div>
            <div className="text-xs text-[#64748B] mt-2">Historical price-snapshotted</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Assigned Customers</span>
              <Store size={16} className="text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">{customers.length}</div>
            <button onClick={() => onNavigate('customers')} className="mt-2 text-xs font-semibold text-indigo-600 inline-flex items-center gap-1 hover:underline">
              View Portfolio <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
              <span>Offline Sync Queue</span>
              <WifiOff size={16} className="text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-[#172033] mt-3">{offlineQueue.length}</div>
            <button onClick={() => onNavigate('sales-orders')} className="mt-2 text-xs font-semibold text-amber-700 inline-flex items-center gap-1 hover:underline">
              {offlineQueue.length > 0 ? 'Sync Pending Orders' : 'All Synced'} <ArrowRight size={12} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#172033]">My Recent Sales Orders</h2>
            <button onClick={() => onNavigate('sales-orders')} className="text-xs font-semibold text-[#2457D6] hover:underline">Book or Sync Orders</button>
          </div>
          <div className="divide-y divide-gray-100">
            {orders.length > 0 ? orders.slice(0, 6).map((o) => (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#172033] font-mono">{o.orderNumber}</div>
                  <div className="text-xs text-[#64748B]">{o.customer?.name || 'Retail/Wholesale'} • {new Date(o.orderDate).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#172033] font-mono">Rs. {Number(o.grandTotal || 0).toLocaleString('en-IN')}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2457D6]">{o.status}</span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-sm text-[#64748B]">No orders booked under your portfolio yet.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. STATUTORY AUDITOR PORTAL (READ-ONLY COMPLIANCE)
  // ───────────────────────────────────────────────────────────────────────────
  const totalGst = invoices
    .filter((i) => i.status !== 'CANCELLED')
    .reduce((s, i) => s + Number(i.cgstAmount || 0) + Number(i.sgstAmount || 0) + Number(i.igstAmount || 0), 0);
  const grossMargin = costing?.batches?.[0]?.grossMarginPct || '38.19';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#172033]">Statutory Audit &amp; GST Compliance Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold">READ-ONLY AUDITOR</span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Immutable stock movement verification, GSTR-1 tax summary, batch absorption costing, and 16 statutory exports.
          </p>
        </div>
        <button
          onClick={() => onNavigate('reports-analytics')}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-xs font-semibold self-start shadow-sm"
        >
          <BarChart2 size={14} /> Open 16 Statutory Reports
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>GST Outward Tax</span>
            <FileText size={16} className="text-[#2457D6]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-3">Rs. {totalGst.toLocaleString('en-IN')}</div>
          <button onClick={() => onNavigate('gst-invoices-eway')} className="mt-2 text-xs font-semibold text-[#2457D6] inline-flex items-center gap-1 hover:underline">
            Inspect GST Invoices <ArrowRight size={12} />
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>Verified Gross Margin</span>
            <TrendingUp size={16} className="text-[#0D9488]" />
          </div>
          <div className="text-2xl font-bold text-[#0D9488] mt-3">{grossMargin}%</div>
          <button onClick={() => onNavigate('costing-margins')} className="mt-2 text-xs font-semibold text-[#0D9488] inline-flex items-center gap-1 hover:underline">
            View Batch Costing <ArrowRight size={12} />
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>Ledger Movements</span>
            <CheckCircle2 size={16} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-3">{movements.length}</div>
          <button onClick={() => onNavigate('stock-movement')} className="mt-2 text-xs font-semibold text-indigo-600 inline-flex items-center gap-1 hover:underline">
            Audit Stock Ledger <ArrowRight size={12} />
          </button>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>Audit Trail Mode</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-3">Immutable</div>
          <button onClick={() => onNavigate('quality-audit-trail')} className="mt-2 text-xs font-semibold text-amber-700 inline-flex items-center gap-1 hover:underline">
            Open Quality &amp; Audit Trail <ArrowRight size={12} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#172033]">Latest Immutable Stock Movements (Read-Only)</h2>
          <button onClick={() => onNavigate('reports-analytics')} className="text-xs font-semibold text-[#2457D6] hover:underline">Export CSV / Excel</button>
        </div>
        <div className="divide-y divide-gray-100">
          {movements.length > 0 ? movements.slice(0, 6).map((m) => (
            <div key={m.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-[#172033]">{m.itemName || m.itemCode}</span>
                <span className="text-[#64748B] ml-2 font-mono">({m.sourceDocumentType || m.movementType})</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="text-green-700">+{Number(m.qtyIn || 0)}</span>
                <span className="text-red-600">-{Number(m.qtyOut || 0)}</span>
                <span className="text-[#64748B]">{new Date(m.transactionDate || m.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          )) : (
            <div className="p-8 text-center text-sm text-[#64748B]">No stock movements recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RolePortalDashboard;

