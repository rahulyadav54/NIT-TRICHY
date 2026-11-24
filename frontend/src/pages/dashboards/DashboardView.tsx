import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import {
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';

export function DashboardView() {
  const { user } = useAuth();
  const [ownerData, setOwnerData] = useState<any>(null);
  const [prodRuns, setProdRuns] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
          const [costRes, orderRes, invRes] = await Promise.all([
            apiRequest('/costing/dashboard'),
            apiRequest('/sales'),
            apiRequest('/invoice'),
          ]);
          setOwnerData(costRes.data);
          setSalesOrders(orderRes.data || []);
          setInvoices(invRes.data || []);
        }

        if (user?.role === 'PRODUCTION_SUPERVISOR' || user?.role === 'OWNER') {
          const prRes = await apiRequest('/production');
          setProdRuns(prRes.data || []);
        }

        if (user?.role === 'SALESMAN') {
          const orderRes = await apiRequest('/sales');
          setSalesOrders(orderRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading role dashboard...</div>;
  }

  // 1. OWNER DASHBOARD
  if (user?.role === 'OWNER') {
    const valuation = ownerData?.inventoryValuation || {};
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Owner Executive Dashboard</h2>
            <p className="text-xs text-slate-500">Real-time enterprise financial health, margins & inventory valuation</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
            Enterprise View
          </span>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Raw Materials Value</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              ₹{valuation.rawMaterialValuation?.toLocaleString('en-IN') || '0'}
            </span>
            <span className="text-[10px] text-teal-600 font-medium">Weighted-Average Costed</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Packaging Value</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              ₹{valuation.packagingValuation?.toLocaleString('en-IN') || '0'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Pouches & Cartons</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Finished Goods Value</span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              ₹{valuation.finishedGoodsValuation?.toLocaleString('en-IN') || '0'}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Available for Sale</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-teal-200 bg-teal-50/30 shadow-sm">
            <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider block">Total Stock Valuation</span>
            <span className="text-xl font-bold text-teal-950 mt-1 block">
              ₹{valuation.totalValuation?.toLocaleString('en-IN') || '0'}
            </span>
            <span className="text-[10px] text-teal-700 font-medium">Derived from Immutable Ledger</span>
          </div>
        </div>

        {/* Production Runs & Efficiency */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Recent Batch Yield & Costing Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Batch Run</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Good Output</th>
                  <th className="px-4 py-3">Yield Variance</th>
                  <th className="px-4 py-3">Cost/Packet</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {prodRuns.map((r) => {
                  const variance = parseFloat(r.yieldVariancePct);
                  const isAlert = Math.abs(variance) > 3.0;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.runNumber}</td>
                      <td className="px-4 py-3 font-sans text-slate-800">{r.productName}</td>
                      <td className="px-4 py-3">{r.goodOutput} pkts</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isAlert ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {variance > 0 ? `+${variance}%` : `${variance}%`}
                          {isAlert && ' (ALERT)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">₹{parseFloat(r.costPerPacket).toFixed(2)}</td>
                      <td className="px-4 py-3">₹50.00</td>
                      <td className="px-4 py-3 text-emerald-700 font-semibold">
                        ₹{(50 - parseFloat(r.costPerPacket)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 2. ADMIN DASHBOARD
  if (user?.role === 'ADMIN') {
    const pendingOrders = salesOrders.filter((o) => o.status === 'SUBMITTED');
    const approvedOrders = salesOrders.filter((o) => o.status === 'APPROVED');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Operations & Admin Dashboard</h2>
            <p className="text-xs text-slate-500">Order verification, approvals, invoicing pipeline & stock reservation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pending Approvals</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">{pendingOrders.length}</span>
            <span className="text-[10px] text-slate-400">Needs Stock Verification</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Approved Orders</span>
            <span className="text-2xl font-bold text-teal-700 mt-1 block">{approvedOrders.length}</span>
            <span className="text-[10px] text-teal-600">Ready for Invoicing</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Invoices Generated</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{invoices.length}</span>
            <span className="text-[10px] text-slate-400">GST Outward Supplies</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Sales</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              ₹{invoices.reduce((a, b) => a + parseFloat(b.grandTotal), 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-600">Billed Orders</span>
          </div>
        </div>

        {/* Incoming Orders Table */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Incoming Sales Orders Pipeline</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Order #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Salesman</th>
                  <th className="px-4 py-3">Grand Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesOrders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">{o.orderNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{o.customerName}</td>
                    <td className="px-4 py-3">{o.salesmanName}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">₹{parseFloat(o.grandTotal).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        o.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // 3. SALESMAN MOBILE DASHBOARD
  if (user?.role === 'SALESMAN') {
    return (
      <div className="space-y-6 max-w-xl mx-auto">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md">
          <span className="text-[11px] font-semibold text-teal-400 uppercase tracking-wider block">Salesman Portal</span>
          <h2 className="text-xl font-bold mt-1">Hello, {user.name}</h2>
          <p className="text-xs text-slate-400 mt-1">Book customer orders directly in the field in under one minute.</p>

          <button className="mt-4 w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition">
            <PlusCircle className="w-5 h-5" />
            + New Sales Order
          </button>
        </div>

        {/* My Order History */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">My Recent Booked Orders</h3>
          <div className="space-y-3">
            {salesOrders.map((o) => (
              <div key={o.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{o.customerName}</div>
                  <div className="text-[10px] font-mono text-slate-500">{o.orderNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900">₹{parseFloat(o.grandTotal).toLocaleString('en-IN')}</div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700">
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fallback for PRODUCTION_SUPERVISOR or AUDITOR
  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
      <ShieldCheck className="w-10 h-10 text-teal-600 mx-auto mb-2" />
      <h3 className="text-base font-bold text-slate-900">{user?.role} Workspace Active</h3>
      <p className="text-xs text-slate-500 mt-1">Access master data, batch production logs, and compliance registers.</p>
    </div>
  );
}
