import { useState, useEffect } from 'react';
import { ShoppingCart, RefreshCw, Receipt, X, WifiOff, CloudUpload } from 'lucide-react';
import { apiRequest, getAuthToken } from '@/services/api';
import {
  OfflineOrderItem,
  getOfflineOrderQueue,
  saveOfflineOrderQueue,
  enqueueOfflineOrder,
  cacheSalesCatalog,
  getCachedSalesCatalog,
} from '@/services/offlineOrders';

export function CommercialView({ subView = 'sales-orders', onNavigate: _onNavigate }: { subView: string; onNavigate?: (path: string) => void }) {
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [costingDashboard, setCostingDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState<OfflineOrderItem[]>(() => getOfflineOrderQueue());
  const [syncing, setSyncing] = useState(false);

  // New sales order form state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerId: '',
    productId: '',
    orderNumber: `SO-${Date.now().toString().slice(-4)}`,
    quantity: 50,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderRes, invRes, custRes, prodRes, costRes] = await Promise.allSettled([
        apiRequest('/sales'),
        apiRequest('/invoice'),
        apiRequest('/master/customers'),
        apiRequest('/master/products'),
        apiRequest('/costing/dashboard'),
      ]);

      if (orderRes.status === 'fulfilled') setSalesOrders(orderRes.value.data || []);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data || []);
      let loadedCusts: any[] = [];
      let loadedProds: any[] = [];
      if (custRes.status === 'fulfilled') {
        loadedCusts = custRes.value.data || [];
      }
      if (prodRes.status === 'fulfilled') {
        loadedProds = prodRes.value.data || [];
      }

      if (loadedCusts.length === 0 || loadedProds.length === 0) {
        const cached = getCachedSalesCatalog();
        if (loadedCusts.length === 0) loadedCusts = cached.customers;
        if (loadedProds.length === 0) loadedProds = cached.products;
      } else {
        cacheSalesCatalog(loadedCusts, loadedProds);
      }

      if (loadedCusts.length > 0) {
        setCustomers(loadedCusts);
        setOrderForm((prev) => ({ ...prev, customerId: prev.customerId || loadedCusts[0].id }));
      }
      if (loadedProds.length > 0) {
        setProducts(loadedProds);
        setOrderForm((prev) => ({ ...prev, productId: prev.productId || loadedProds[0].id }));
      }
      if (costRes.status === 'fulfilled') setCostingDashboard(costRes.value.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineOrders = async () => {
    const queue = getOfflineOrderQueue();
    if (queue.length === 0 || !navigator.onLine) return;
    setSyncing(true);
    const remaining: OfflineOrderItem[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        await apiRequest('/sales', {
          method: 'POST',
          body: JSON.stringify({
            customerId: item.customerId,
            orderNumber: item.orderNumber,
            notes: 'Captured offline and auto-synced',
            items: [{ productId: item.productId, quantity: item.quantity }],
          }),
        });
        syncedCount++;
      } catch (err: any) {
        remaining.push({ ...item, lastError: err.message || 'Sync failed' });
      }
    }

    saveOfflineOrderQueue(remaining);
    setOfflineQueue(remaining);
    setSyncing(false);
    if (syncedCount > 0) {
      setActionMsg(`Synced ${syncedCount} offline order(s) to server.`);
      loadData();
    }
  };

  useEffect(() => {
    loadData();
  }, [subView]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineOrders();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine && getOfflineOrderQueue().length > 0) {
      syncOfflineOrders();
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find((c) => c.id === orderForm.customerId);
    const prod = products.find((p) => p.id === orderForm.productId);

    const queueOffline = () => {
      const updated = enqueueOfflineOrder({
        localId: `off-${Date.now()}`,
        customerId: orderForm.customerId,
        customerName: cust?.name || 'Customer',
        productId: orderForm.productId,
        productName: prod?.name || 'Product',
        quantity: Number(orderForm.quantity),
        unitPrice: Number(prod?.sellingPrice || 50),
        orderNumber: orderForm.orderNumber,
        createdAt: new Date().toISOString(),
      });
      setOfflineQueue(updated);
      setShowOrderModal(false);
      setOrderForm((prev) => ({ ...prev, orderNumber: `SO-${Date.now().toString().slice(-4)}` }));
      setActionMsg(`Offline mode: Order ${orderForm.orderNumber} queued locally and will sync automatically when online.`);
    };

    if (!navigator.onLine) {
      queueOffline();
      return;
    }

    try {
      await apiRequest('/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: orderForm.customerId,
          orderNumber: orderForm.orderNumber,
          items: [
            {
              productId: orderForm.productId,
              quantity: Number(orderForm.quantity),
            },
          ],
        }),
      });
      setShowOrderModal(false);
      setOrderForm((prev) => ({ ...prev, orderNumber: `SO-${Date.now().toString().slice(-4)}` }));
      setActionMsg('Sales order created and submitted.');
      loadData();
    } catch (err: any) {
      if (err instanceof TypeError || String(err.message).toLowerCase().includes('fetch')) {
        queueOffline();
      } else {
        alert(err.message || 'Failed to create sales order');
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiRequest(`/sales/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setActionMsg(`Order ${status.toLowerCase()} successfully.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  const handleGenerateInvoice = async (orderId: string) => {
    try {
      await apiRequest(`/invoice/from-order/${orderId}`, { method: 'POST' });
      setActionMsg('GST Tax Invoice generated.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice');
    }
  };

  const handleDispatchInvoice = async (invoiceId: string) => {
    try {
      await apiRequest('/dispatch', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      });
      setActionMsg('Dispatch completed & stock deducted from ledger.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch invoice');
    }
  };

  const handleRecordPayment = async (inv: any) => {
    const due = Number(inv.balanceDue ?? inv.grandTotal ?? 0);
    if (due <= 0) return;
    try {
      await apiRequest('/payment', {
        method: 'POST',
        body: JSON.stringify({
          customerId: inv.customerId,
          invoiceId: inv.id,
          amount: due,
          paymentMode: 'NEFT',
          referenceNumber: `NEFT-${Date.now().toString().slice(-6)}`,
        }),
      });
      setActionMsg(`Payment of ₹${due.toLocaleString('en-IN')} recorded.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  };

  const handleCancelInvoice = async (inv: any) => {
    const reason = window.prompt(`Enter reason to cancel ${inv.invoiceNumber} via Credit Note:`, 'Order correction / Customer request');
    if (!reason) return;
    try {
      const res = await apiRequest(`/invoice/${inv.id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setActionMsg(res.message || `Invoice ${inv.invoiceNumber} cancelled with Credit Note.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice');
    }
  };

  const selectedProduct = products.find((p) => p.id === orderForm.productId) || products[0];
  const selectedPrice = Number(selectedProduct?.sellingPrice || 50);

  const valuation = costingDashboard?.inventoryValuation || {};

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Top Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md py-space-md bg-surface">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              {subView === 'sales-orders' && 'Commercial Sales Orders & Price Snapshotting'}
              {subView === 'customers' && 'Retail & Wholesale Customers'}
              {subView === 'gst-invoices-eway' && 'GST Compliance Invoices & E-Way Bills'}
              {subView === 'payments-receivables' && 'Payments & Outstanding Receivables'}
              {subView === 'costing-margins' && 'Batch Costing, Margins & Gross Valuation'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-micro text-label-micro uppercase font-semibold">
              Commercial Engine
            </span>
          </div>
          <p className="font-body-default text-body-default text-secondary mt-0.5">
            Real-time wholesale and retail order booking, GST tax engine (CGST/SGST vs IGST), and unit margin analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {subView === 'sales-orders' && (
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
            >
              <ShoppingCart size={15} className="flex-shrink-0" />
              <span>New Sales Order</span>
            </button>
          )}
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 h-9 px-3 bg-white hover:bg-gray-50 text-[#172033] text-sm font-medium rounded-lg shadow-sm border border-gray-200 whitespace-nowrap flex-shrink-0"
          >
            <RefreshCw size={15} className={`text-[#64748B] flex-shrink-0 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {(!isOnline || offlineQueue.length > 0) && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-amber-900 text-sm">
            <WifiOff size={16} className="text-amber-600 flex-shrink-0" />
            <span>
              {!isOnline
                ? 'Offline Mode Active — Orders captured now are saved locally and queued for sync.'
                : `${offlineQueue.length} offline order(s) waiting to sync to server.`}
            </span>
          </div>
          {offlineQueue.length > 0 && isOnline && (
            <button
              onClick={syncOfflineOrders}
              disabled={syncing}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-xs font-semibold"
            >
              <CloudUpload size={14} />
              <span>{syncing ? 'Syncing...' : `Sync ${offlineQueue.length} Order(s) Now`}</span>
            </button>
          )}
        </div>
      )}

      {actionMsg && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">×</button>
        </div>
      )}

      {/* VIEW 1: SALES & ORDERS */}
      {subView === 'sales-orders' && (
        <div className="space-y-space-md">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Total Orders Booked</span>
              <div className="font-metric-display text-metric-display text-on-surface mt-1">{salesOrders.length || 2}</div>
              <span className="font-label-micro text-label-micro text-tertiary">Field Sales Synced</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Total Booked Value</span>
              <div className="font-metric-display text-metric-display text-primary mt-1">
                ₹{salesOrders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0).toLocaleString('en-IN') || '78,500'}
              </div>
              <span className="font-label-micro text-label-micro text-secondary">Includes Tax & Wholesale Margins</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Stock Allocation Status</span>
              <div className="font-metric-display text-metric-display text-tertiary mt-1">100% Reserved</div>
              <span className="font-label-micro text-label-micro text-tertiary">Distributor A Dispatched (570 pkts)</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Shortage Blocked</span>
              <div className="font-metric-display text-metric-display text-error mt-1">1 Block</div>
              <span className="font-label-micro text-label-micro text-error">Distributor B: 1000 pkts &gt; 370 pkts avail</span>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
            <div className="p-space-md border-b border-surface-container flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Sales Orders Register</h3>
              <span className="text-secondary font-label-micro text-label-micro font-mono">Real-time Historical Price Lock</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-table-header text-table-header uppercase">
                    <th className="py-2.5 px-3">Order Number</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer & Destination</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3 text-right">Items / Pkts</th>
                    <th className="py-2.5 px-3 text-right">Taxable Value</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-table-data text-table-data">
                  {offlineQueue.map((oq) => (
                    <tr key={oq.localId} className="bg-amber-50/70">
                      <td className="py-2.5 px-3 font-mono font-semibold text-amber-800">{oq.orderNumber}</td>
                      <td className="py-2.5 px-3 text-amber-700">{new Date(oq.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-2.5 px-3 font-medium text-[#172033]">{oq.customerName}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold uppercase">OFFLINE QUEUE</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#172033]">{oq.quantity} pkts</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-800">₹{(oq.quantity * oq.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">Pending Tax</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">PENDING SYNC</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-amber-700">Auto-sync on online</td>
                    </tr>
                  ))}
                  {salesOrders.length > 0 ? (
                    salesOrders.map((o) => {
                      const totalPkts = (o.items || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);
                      return (
                      <tr key={o.id || o.orderNumber} className="hover:bg-surface-container-low/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">{o.orderNumber}</td>
                        <td className="py-2.5 px-3 text-secondary">{new Date(o.orderDate || Date.now()).toLocaleDateString('en-IN')}</td>
                        <td className="py-2.5 px-3 font-medium text-on-surface">{o.customerName || 'Customer'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-surface-container font-label-micro text-label-micro font-semibold uppercase">
                            {o.customerType || 'WHOLESALE'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-on-surface tabular-nums whitespace-nowrap">{totalPkts} pkts</td>
                        <td className="py-2.5 px-3 text-right text-secondary tabular-nums whitespace-nowrap">
                          ₹{Number(o.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-primary tabular-nums whitespace-nowrap">
                          ₹{Number(o.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                          {(o.status === 'SUBMITTED' || o.status === 'DRAFT') && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, 'APPROVED')}
                                className="px-2 py-1 rounded bg-[#0D9488] hover:bg-[#0b7a70] text-white text-[11px] font-semibold"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(o.id, 'REJECTED')}
                                className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {o.status === 'APPROVED' && (
                            <button
                              onClick={() => handleGenerateInvoice(o.id)}
                              className="px-2 py-1 rounded bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-[11px] font-semibold"
                            >
                              Generate Invoice
                            </button>
                          )}
                        </td>
                      </tr>
                    );})
                  ) : (
                    <tr className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary">SO-2024-001</td>
                      <td className="py-2.5 px-3 text-secondary">14 Oct 2024</td>
                      <td className="py-2.5 px-3 font-medium text-on-surface">Distributor A (Tamil Nadu, Intra-state)</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-surface-container font-label-micro text-label-micro font-semibold uppercase">
                          WHOLESALE
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-on-surface">570 pkts</td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">₹27,142.86</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">₹28,500.00</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          DISPATCHED
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: GST INVOICES & E-WAY */}
      {subView === 'gst-invoices-eway' && (
        <div className="space-y-space-md">
          {/* GST Rules Indicator Strip */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-[#2457D6] flex items-center justify-center text-white">
                <Receipt size={18} />
              </span>
              <div>
                <h4 className="font-body-strong text-body-strong text-on-surface">GST Tax Determination Rule</h4>
                <p className="font-label-default text-label-default text-secondary">
                  Intra-state (State 33 Tamil Nadu) $\rightarrow$ CGST 2.5% + SGST 2.5% (Total 5%) | Inter-state $\rightarrow$ IGST 5.0%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-micro text-label-micro font-bold">
                E-Way Bill: Integrated
              </span>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
            <div className="p-space-md border-b border-surface-container flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">GST Outward Supplies Invoices</h3>
              <span className="text-secondary font-label-micro text-label-micro font-mono">Filing Ready (GSTR-1 Compatible)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-table-header text-table-header uppercase">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Buyer GSTIN</th>
                    <th className="py-2.5 px-3">Supply Type</th>
                    <th className="py-2.5 px-3 text-right">Taxable Amt</th>
                    <th className="py-2.5 px-3 text-right">CGST (2.5%)</th>
                    <th className="py-2.5 px-3 text-right">SGST (2.5%)</th>
                    <th className="py-2.5 px-3 text-right">IGST (5.0%)</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-right">Status / Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-table-data text-table-data">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => (
                      <tr key={inv.id || inv.invoiceNumber} className="hover:bg-surface-container-low/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-primary">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3 text-secondary">{new Date(inv.invoiceDate || Date.now()).toLocaleDateString('en-IN')}</td>
                        <td className="py-2.5 px-3 font-mono text-on-surface">{inv.buyerGstin || inv.customerGstin || '33AAAAA0000A1Z5'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded font-label-micro text-label-micro font-semibold uppercase ${
                            inv.isInterState ? 'bg-secondary-container text-on-secondary-fixed' : 'bg-surface-container text-primary'
                          }`}>
                            {inv.isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST+SGST)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-secondary">
                          ₹{Number(inv.subtotal || inv.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-secondary">
                          {inv.isInterState ? '-' : `₹${Number(inv.cgstAmount || 0).toFixed(2)}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-secondary">
                          {inv.isInterState ? '-' : `₹${Number(inv.sgstAmount || 0).toFixed(2)}`}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-secondary">
                          {inv.isInterState ? `₹${Number(inv.igstAmount || 0).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">
                          ₹{Number(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold mr-1">
                            {inv.status || 'ISSUED'}
                          </span>
                          <button
                            onClick={async () => {
                              const tok = getAuthToken();
                              const res = await fetch(`/api/invoice/${inv.id}/pdf`, {
                                headers: tok ? { Authorization: `Bearer ${tok}` } : {},
                              });
                              if (!res.ok) return alert('PDF download failed');
                              const blob = await res.blob();
                              const u = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = u;
                              a.download = `${String(inv.invoiceNumber || 'invoice').replace(/\//g, '-')}.pdf`;
                              a.click();
                              URL.revokeObjectURL(u);
                            }}
                            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-[#172033] text-[11px] font-semibold"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => handleDispatchInvoice(inv.id)}
                            className="px-2 py-1 rounded bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-[11px] font-semibold"
                          >
                            Dispatch
                          </button>
                          {Number(inv.balanceDue ?? inv.grandTotal ?? 0) > 0 && (
                            <button
                              onClick={() => handleRecordPayment(inv)}
                              className="px-2 py-1 rounded bg-[#0D9488] hover:bg-[#0b7a70] text-white text-[11px] font-semibold"
                            >
                              Pay Due
                            </button>
                          )}
                          {inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleCancelInvoice(inv)}
                              className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold"
                              title="Cancel with Credit Note"
                            >
                              Credit Note
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary">INV-2024-001</td>
                      <td className="py-2.5 px-3 text-secondary">14 Oct 2024</td>
                      <td className="py-2.5 px-3 font-mono text-on-surface">33AAAAA0000A1Z5</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-label-micro text-label-micro font-semibold uppercase">
                          INTRA-STATE (CGST+SGST)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">₹27,142.86</td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">₹678.57</td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">₹678.57</td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">-</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">₹28,500.00</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          Generated
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: COSTING & MARGINS */}
      {subView === 'costing-margins' && (
        <div className="space-y-space-md">
          {/* Inventory Valuation Bento Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">
                Raw Material Valuation (WAC)
              </span>
              <div className="font-metric-display text-metric-display text-on-surface mt-1">
                ₹{Number(valuation.rawMaterialValuation || 86250).toLocaleString('en-IN')}
              </div>
              <span className="font-label-micro text-label-micro text-tertiary">Flour ₹43.125/kg WAC</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">
                Packaging Material Value
              </span>
              <div className="font-metric-display text-metric-display text-on-surface mt-1">
                ₹{Number(valuation.packagingValuation || 10800).toLocaleString('en-IN')}
              </div>
              <span className="font-label-micro text-label-micro text-secondary">Pouches & Outer Cartons</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">
                Finished Goods Value
              </span>
              <div className="font-metric-display text-metric-display text-primary mt-1">
                ₹{Number(valuation.finishedGoodsValuation || 11433).toLocaleString('en-IN')}
              </div>
              <span className="font-label-micro text-label-micro text-primary">370 pkts @ ₹30.90 unit cost</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">
                Gross Margin %
              </span>
              <div className="font-metric-display text-metric-display text-tertiary mt-1">
                38.19%
              </div>
              <span className="font-label-micro text-label-micro text-tertiary font-bold">
                Margin ₹19.10 / pkt (SP ₹50 - CP ₹30.90)
              </span>
            </div>
          </div>

          {/* Batch Costing Breakdown Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
            <div className="p-space-md border-b border-surface-container flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Batch Costing & Finished Good Absorption
              </h3>
              <span className="text-secondary font-label-micro text-label-micro font-mono">
                Formula: (Total Batch Cost - Damaged Scrap Credit) ÷ Good Pkts
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-table-header text-table-header uppercase">
                    <th className="py-2.5 px-3">Batch Run</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-right">Raw Material Cost</th>
                    <th className="py-2.5 px-3 text-right">Packaging Cost</th>
                    <th className="py-2.5 px-3 text-right">Total Batch Cost</th>
                    <th className="py-2.5 px-3 text-right">Good Output</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost / Pkt</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Gross Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-table-data text-table-data">
                  <tr className="hover:bg-surface-container-low/70 transition-colors font-mono">
                    <td className="py-2.5 px-3 font-semibold text-primary">BATCH-MRK-001</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-on-surface">Trichy Murukku 200g</td>
                    <td className="py-2.5 px-3 text-right text-secondary">₹24,850.00</td>
                    <td className="py-2.5 px-3 text-right text-secondary">₹4,200.00</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-on-surface">₹29,050.00</td>
                    <td className="py-2.5 px-3 text-right text-on-surface">940 pkts</td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary">₹30.90</td>
                    <td className="py-2.5 px-3 text-right text-on-surface">₹50.00</td>
                    <td className="py-2.5 px-3 text-right font-bold text-tertiary">38.19%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: CUSTOMERS */}
      {subView === 'customers' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033]">Registered Retail & Wholesale Customers</h3>
            <span className="text-xs text-[#64748B] font-mono">{customers.length} Active Accounts</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Customer Name</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">GSTIN</th>
                  <th className="py-2.5 px-4">State</th>
                  <th className="py-2.5 px-4 text-right">Credit Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-mono text-[#2457D6] font-semibold">{c.code}</td>
                    <td className="py-2.5 px-4 font-medium text-[#172033]">{c.name}</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 rounded bg-blue-50 text-[#2457D6] text-xs font-semibold">{c.type}</span></td>
                    <td className="py-2.5 px-4 font-mono text-xs">{c.gstin}</td>
                    <td className="py-2.5 px-4 text-[#64748B]">{c.state} ({c.stateCode})</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{Number(c.creditLimit || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 5: PAYMENTS & RECEIVABLES */}
      {subView === 'payments-receivables' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033]">Invoice Receivables & Collections</h3>
            <span className="text-xs text-[#64748B] font-mono">{invoices.length} Invoices</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4 text-right">Grand Total</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#2457D6]">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-4 text-right font-mono">₹{Number(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-red-600">₹{Number(inv.balanceDue ?? inv.grandTotal ?? 0).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 px-4 text-xs font-semibold">{inv.status}</td>
                    <td className="py-2.5 px-4 text-right">
                      {Number(inv.balanceDue ?? inv.grandTotal ?? 0) > 0 && (
                        <button
                          onClick={() => handleRecordPayment(inv)}
                          className="px-3 py-1 rounded-lg bg-[#0D9488] hover:bg-[#0b7a70] text-white text-xs font-semibold"
                        >
                          Record Full Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Sales Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Book Sales Order</h3>
              <button onClick={() => setShowOrderModal(false)} className="text-[#64748B] hover:text-[#172033]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4 mt-4">
              <div>
                <label className="font-label-default text-label-default text-secondary block mb-1">Customer</label>
                <select
                  required
                  value={orderForm.customerId}
                  onChange={(e) => setOrderForm({ ...orderForm, customerId: e.target.value })}
                  className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.stateCode === '33' ? 'Tamil Nadu • Intra-state' : 'Inter-state'})
                    </option>
                  ))}
                  {customers.length === 0 && (
                    <option value="cust-1">Distributor A (Tamil Nadu)</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Order Number</label>
                  <input
                    required
                    value={orderForm.orderNumber}
                    onChange={(e) => setOrderForm({ ...orderForm, orderNumber: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-default text-label-default text-secondary block mb-1">Product SKU</label>
                <select
                  required
                  value={orderForm.productId}
                  onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                  className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.packSize}) — ₹{Number(p.sellingPrice).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Ordered Quantity (pkts)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Unit Selling Price (₹)</label>
                  <input
                    type="number"
                    disabled
                    value={selectedPrice}
                    className="w-full h-8 px-2.5 text-body-default bg-surface-container text-secondary border border-outline-variant/60 rounded"
                  />
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded border border-surface-container flex justify-between items-center text-xs">
                <span className="text-secondary font-medium">Estimated Subtotal (excl. GST):</span>
                <span className="font-mono font-bold text-primary text-sm">
                  ₹{(orderForm.quantity * selectedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="h-8 px-4 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-strong"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded bg-primary-container hover:bg-primary text-on-primary font-body-strong"
                >
                  Confirm & Reserve Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommercialView;
