import { useEffect, useState } from 'react';
import { apiRequest } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Factory,
  Package,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react';

export function AlertsActionCenter({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [varianceRuns, setVarianceRuns] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [pendingDispatches, setPendingDispatches] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [stockRes, prodRes, salesRes, dispRes, invRes] = await Promise.allSettled([
        apiRequest('/inventory/stock'),
        apiRequest('/production'),
        apiRequest('/sales'),
        apiRequest('/dispatch/pending'),
        apiRequest('/invoice'),
      ]);

      if (stockRes.status === 'fulfilled') {
        const items = stockRes.value.data || [];
        setLowStock(items.filter((i: any) => Number(i.closingQty || 0) <= Number(i.reorderLevel || 0)));
      }
      if (prodRes.status === 'fulfilled') {
        const runs = prodRes.value.data || [];
        setVarianceRuns(
          runs.filter(
            (r: any) =>
              Math.abs(Number(r.yieldVariancePct || 0)) > 3 ||
              (r.consumptions || []).some((c: any) => Math.abs(Number(c.variancePct || 0)) > 3)
          )
        );
      }
      if (salesRes.status === 'fulfilled') {
        const orders = salesRes.value.data || [];
        setPendingOrders(orders.filter((o: any) => o.status === 'SUBMITTED' || o.status === 'DRAFT'));
      }
      if (dispRes.status === 'fulfilled') {
        setPendingDispatches(dispRes.value.data || []);
      }
      if (invRes.status === 'fulfilled') {
        const invs = invRes.value.data || [];
        setUnpaidInvoices(invs.filter((i: any) => Number(i.balanceDue || 0) > 0 && i.status !== 'CANCELLED'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleApproveOrder = async (orderId: string) => {
    setMsg('');
    try {
      await apiRequest(`/sales/${orderId}/approve`, { method: 'POST', body: JSON.stringify({}) });
      setMsg('Sales order approved and moved to GST Invoicing.');
      loadAlerts();
    } catch (err: any) {
      setMsg(err.message || 'Unable to approve order (verify finished goods stock).');
    }
  };

  const canApproveSales = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const totalAlerts =
    lowStock.length +
    varianceRuns.length +
    (canApproveSales ? pendingOrders.length + pendingDispatches.length : 0);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold text-[#172033]">Alerts &amp; Action Center</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
              {totalAlerts} ACTIVE ALERTS
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time operational exceptions: stockout risks, ±3% BOM variance flags, pending approvals, and dispatch queue.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="inline-flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-[#172033] whitespace-nowrap self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {msg && (
        <div className="px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-[#1a3fa8] font-medium flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="font-bold">×</button>
        </div>
      )}

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>Low Stock Reorders</span>
            <Package size={16} className="text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2">{lowStock.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>±3% Variance Flags</span>
            <AlertTriangle size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{varianceRuns.length}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>Pending Order Approvals</span>
            <ShoppingBag size={16} className="text-[#2457D6]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2">{canApproveSales ? pendingOrders.length : '—'}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-[#64748B]">
            <span>Pending Dispatches</span>
            <Truck size={16} className="text-[#0D9488]" />
          </div>
          <div className="text-2xl font-bold text-[#172033] mt-2">{canApproveSales ? pendingDispatches.length : '—'}</div>
        </div>
      </div>

      {/* Action Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-red-600" />
              <h2 className="text-base font-semibold text-[#172033]">Material Reorder Alerts</h2>
            </div>
            <button
              onClick={() => onNavigate('purchases-grn')}
              className="text-xs font-semibold text-[#2457D6] hover:underline inline-flex items-center gap-1"
            >
              <ShoppingCart size={13} /> Record Purchase / GRN
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStock.length > 0 ? lowStock.map((item) => (
              <div key={item.id || item.code} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#172033]">{item.name}</div>
                  <div className="text-xs text-[#64748B]">
                    Code: <span className="font-mono">{item.code}</span> • Closing: <span className="font-semibold text-red-600">{item.closingQty} {item.unit}</span> (Reorder ≤ {item.reorderLevel})
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('purchases-grn')}
                  className="h-8 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold whitespace-nowrap"
                >
                  Restock PO
                </button>
              </div>
            )) : (
              <div className="p-6 text-center text-sm text-[#64748B] flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-[#0D9488]" /> All raw &amp; packaging materials are above reorder levels.
              </div>
            )}
          </div>
        </div>

        {/* 2. Production Variance Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Factory size={16} className="text-amber-600" />
              <h2 className="text-base font-semibold text-[#172033]">Production Variance Alerts (&gt; ±3%)</h2>
            </div>
            <button
              onClick={() => onNavigate('production-runs')}
              className="text-xs font-semibold text-[#2457D6] hover:underline inline-flex items-center gap-1"
            >
              View Runs <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {varianceRuns.length > 0 ? varianceRuns.map((run) => (
              <div key={run.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#172033] font-mono">{run.runNumber || run.batchCode || run.id.slice(0, 8)}</div>
                  <div className="text-xs text-[#64748B]">
                    Yield Variance: <span className="font-semibold text-amber-700">{Number(run.yieldVariancePct || 0).toFixed(2)}%</span> • Damaged Pouches: {run.damagedPackagingQty || 0}
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('production-runs')}
                  className="h-8 px-3 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold whitespace-nowrap"
                >
                  Inspect Batch
                </button>
              </div>
            )) : (
              <div className="p-6 text-center text-sm text-[#64748B] flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-[#0D9488]" /> No production batches exceeded the ±3% tolerance.
              </div>
            )}
          </div>
        </div>

        {/* 3. Pending Approvals & Dispatch (Owner / Admin) */}
        {canApproveSales && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={16} className="text-[#2457D6]" />
                  <h2 className="text-base font-semibold text-[#172033]">Sales Orders Awaiting Approval</h2>
                </div>
                <button onClick={() => onNavigate('sales-orders')} className="text-xs font-semibold text-[#2457D6] hover:underline">
                  Open Orders
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingOrders.length > 0 ? pendingOrders.map((o) => (
                  <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#172033] font-mono">{o.orderNumber}</div>
                      <div className="text-xs text-[#64748B]">{o.customerName || o.customer?.name || 'Customer'} • ₹{Number(o.grandTotal || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => handleApproveOrder(o.id)}
                      className="h-8 px-3 rounded-lg bg-[#0D9488] hover:bg-[#0f766e] text-white text-xs font-semibold whitespace-nowrap"
                    >
                      Approve Now
                    </button>
                  </div>
                )) : (
                  <div className="p-6 text-center text-sm text-[#64748B]">No sales orders awaiting approval.</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-indigo-600" />
                  <h2 className="text-base font-semibold text-[#172033]">Dispatch &amp; Receivables Queue</h2>
                </div>
                <button onClick={() => onNavigate('dispatch-gate-pass')} className="text-xs font-semibold text-[#2457D6] hover:underline">
                  Dispatch Gate Pass
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {pendingDispatches.slice(0, 3).map((d) => (
                  <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#172033] font-mono">{d.invoiceNumber}</div>
                      <div className="text-xs text-[#64748B]">Ready for Gate-Pass Dispatch • ₹{Number(d.grandTotal || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => onNavigate('dispatch-gate-pass')}
                      className="h-8 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-xs font-semibold whitespace-nowrap"
                    >
                      Dispatch
                    </button>
                  </div>
                ))}
                {unpaidInvoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#172033] font-mono">{inv.invoiceNumber}</div>
                      <div className="text-xs text-[#64748B]">Balance Due: ₹{Number(inv.balanceDue || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <button
                      onClick={() => onNavigate('payments-receivables')}
                      className="h-8 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-semibold text-[#172033] whitespace-nowrap"
                    >
                      Collect Payment
                    </button>
                  </div>
                ))}
                {pendingDispatches.length === 0 && unpaidInvoices.length === 0 && (
                  <div className="p-6 text-center text-sm text-[#64748B]">All dispatches and receivables are up to date.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AlertsActionCenter;
