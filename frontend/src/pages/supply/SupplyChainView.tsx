import { useState, useEffect } from 'react';
import { ShoppingCart, Users, Truck, PlusCircle, RefreshCw, X } from 'lucide-react';
import { apiRequest } from '@/services/api';

export function SupplyChainView({ subView = 'purchases-grn' }: { subView: string; onNavigate?: (path: string) => void }) {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [showPoModal, setShowPoModal] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierId: '',
    materialId: '',
    poNumber: `PO-${Date.now().toString().slice(-4)}`,
    orderedQty: 60,
    receivedQty: 60,
    unitRate: 45,
    unit: 'KG',
  });

  const createInitialSupForm = () => ({
    code: `SUP-${Date.now().toString().slice(-4)}`,
    name: '',
    gstin: '',
    contactInfo: '',
    address: 'Trichy Industrial Estate, Tamil Nadu',
    state: 'Tamil Nadu',
    stateCode: '33',
    paymentTerms: 'Net 15 Days',
  });

  const [showSupModal, setShowSupModal] = useState(false);
  const [supForm, setSupForm] = useState(createInitialSupForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, matRes, invRes] = await Promise.allSettled([
        apiRequest('/purchase'),
        apiRequest('/master/suppliers'),
        apiRequest('/master/materials'),
        apiRequest('/invoice'),
      ]);
      if (poRes.status === 'fulfilled') setPurchases(poRes.value.data || []);
      if (supRes.status === 'fulfilled') {
        const slist = supRes.value.data || [];
        setSuppliers(slist);
        if (slist.length > 0) setPoForm((p) => ({ ...p, supplierId: p.supplierId || slist[0].id }));
      }
      if (matRes.status === 'fulfilled') {
        const mlist = matRes.value.data || [];
        setMaterials(mlist);
        if (mlist.length > 0) setPoForm((p) => ({ ...p, materialId: p.materialId || mlist[0].id, unit: mlist[0].unit || 'KG' }));
      }
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subView]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/purchase', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: poForm.supplierId,
          poNumber: poForm.poNumber,
          status: 'RECEIVED',
          items: [
            {
              materialId: poForm.materialId,
              orderedQty: Number(poForm.orderedQty),
              receivedQty: Number(poForm.receivedQty),
              unitRate: Number(poForm.unitRate),
              unit: poForm.unit,
            },
          ],
        }),
      });
      setShowPoModal(false);
      setPoForm((p) => ({ ...p, poNumber: `PO-${Date.now().toString().slice(-4)}` }));
      setMsg('Purchase GRN recorded and inventory ledger updated.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase');
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/master/suppliers', {
        method: 'POST',
        body: JSON.stringify(supForm),
      });
      setShowSupModal(false);
      setSupForm(createInitialSupForm());
      setMsg('Supplier added to directory.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add supplier');
    }
  };

  const handleDispatch = async (invoiceId: string) => {
    try {
      await apiRequest('/dispatch', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      });
      setMsg('Dispatch completed & finished goods stock deducted.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch');
    }
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
            {subView === 'purchases-grn' && 'Purchases & Goods Receipt Notes (GRN)'}
            {subView === 'suppliers-directory' && 'Suppliers Directory'}
            {subView === 'dispatch-gate-pass' && 'Dispatch & Gate Pass Operations'}
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Live supply chain receipts, supplier GSTIN records, and atomic finished-goods dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {subView === 'purchases-grn' && (
            <button
              onClick={() => setShowPoModal(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-sm font-semibold shadow-sm whitespace-nowrap flex-shrink-0"
            >
              <ShoppingCart size={15} className="flex-shrink-0" />
              <span>Record Purchase / GRN</span>
            </button>
          )}
          {subView === 'suppliers-directory' && (
            <button
              onClick={() => {
                setSupForm(createInitialSupForm());
                setShowSupModal(true);
              }}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-sm font-semibold shadow-sm whitespace-nowrap flex-shrink-0"
            >
              <PlusCircle size={15} className="flex-shrink-0" />
              <span>Add Supplier</span>
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

      {msg && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="font-bold">×</button>
        </div>
      )}

      {subView === 'purchases-grn' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#2457D6]" />
              Purchase Register ({purchases.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="py-2.5 px-4">PO Number</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Supplier</th>
                  <th className="py-2.5 px-4">Items</th>
                  <th className="py-2.5 px-4 text-right">Grand Total</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchases.length > 0 ? (
                  purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-mono font-semibold text-[#2457D6]">{p.poNumber}</td>
                      <td className="py-2.5 px-4 text-[#64748B]">{new Date(p.orderDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-2.5 px-4 font-medium text-[#172033]">{p.supplierName}</td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B]">
                        {(p.items || []).map((it: any) => `${it.materialName} (${it.receivedQty} ${it.unit})`).join(', ')}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold">₹{Number(p.grandTotal).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold">{p.status}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[#64748B]">
                      No purchase orders recorded yet. Click "Record Purchase / GRN" to add stock.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subView === 'suppliers-directory' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
              <Users size={16} className="text-[#2457D6]" />
              Registered Suppliers ({suppliers.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Supplier Name</th>
                  <th className="py-2.5 px-4">GSTIN</th>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">State</th>
                  <th className="py-2.5 px-4">Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-mono text-[#2457D6] font-semibold">{s.code}</td>
                    <td className="py-2.5 px-4 font-medium text-[#172033]">{s.name}</td>
                    <td className="py-2.5 px-4 font-mono text-xs">{s.gstin}</td>
                    <td className="py-2.5 px-4 text-[#64748B]">{s.contactInfo}</td>
                    <td className="py-2.5 px-4 text-[#64748B]">{s.state} ({s.stateCode})</td>
                    <td className="py-2.5 px-4 text-xs">{s.paymentTerms || 'Standard'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subView === 'dispatch-gate-pass' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
              <Truck size={16} className="text-[#0D9488]" />
              Invoiced Orders Ready for Dispatch ({invoices.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Place of Supply</th>
                  <th className="py-2.5 px-4 text-right">Grand Total</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length > 0 ? (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-mono font-semibold text-[#2457D6]">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-4 font-medium text-[#172033]">{inv.customerName}</td>
                      <td className="py-2.5 px-4 text-[#64748B]">{inv.placeOfSupply}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          onClick={() => handleDispatch(inv.id)}
                          className="px-3 py-1 rounded-lg bg-[#0D9488] hover:bg-[#0b7a70] text-white text-xs font-semibold"
                        >
                          Confirm Dispatch
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[#64748B]">
                      No invoices pending dispatch. Generate an invoice from an approved sales order first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showPoModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-[#172033]">Record Purchase & GRN</h3>
              <button onClick={() => setShowPoModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleCreatePO} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Supplier</label>
                <select value={poForm.supplierId} onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })} className="w-full h-9 px-3 border border-gray-200 rounded-lg">
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Material</label>
                <select
                  value={poForm.materialId}
                  onChange={(e) => {
                    const mat = materials.find((m) => m.id === e.target.value);
                    setPoForm({ ...poForm, materialId: e.target.value, unit: mat?.unit || 'KG' });
                  }}
                  className="w-full h-9 px-3 border border-gray-200 rounded-lg"
                >
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">PO Number</label>
                  <input required value={poForm.poNumber} onChange={(e) => setPoForm({ ...poForm, poNumber: e.target.value })} className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Received Qty ({poForm.unit})</label>
                  <input type="number" step="0.01" required value={poForm.receivedQty} onChange={(e) => setPoForm({ ...poForm, orderedQty: Number(e.target.value), receivedQty: Number(e.target.value) })} className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Rate (₹/{poForm.unit})</label>
                  <input type="number" step="0.01" required value={poForm.unitRate} onChange={(e) => setPoForm({ ...poForm, unitRate: Number(e.target.value) })} className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowPoModal(false)} className="h-9 px-4 rounded-lg bg-gray-100 text-[#172033] font-medium">Cancel</button>
                <button type="submit" className="h-9 px-4 rounded-lg bg-[#2457D6] text-white font-semibold">Receive & Update Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-semibold text-[#172033]">Add Supplier</h3>
              <button onClick={() => setShowSupModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="space-y-3 mt-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Supplier Code</label>
                  <input required value={supForm.code} onChange={(e) => setSupForm({ ...supForm, code: e.target.value })} placeholder="SUP-1001" className="w-full h-9 px-3 border border-gray-200 rounded-lg font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">GSTIN (15 chars)</label>
                  <input required minLength={15} maxLength={15} value={supForm.gstin} onChange={(e) => setSupForm({ ...supForm, gstin: e.target.value.toUpperCase() })} placeholder="33AAAAA1111A1Z5" className="w-full h-9 px-3 border border-gray-200 rounded-lg font-mono uppercase" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Supplier Name</label>
                <input required value={supForm.name} onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} placeholder="Enter supplier company or contact name" className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Contact Number / Info</label>
                  <input required value={supForm.contactInfo} onChange={(e) => setSupForm({ ...supForm, contactInfo: e.target.value })} placeholder="+91 98765 43210" className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Payment Terms</label>
                  <input value={supForm.paymentTerms} onChange={(e) => setSupForm({ ...supForm, paymentTerms: e.target.value })} placeholder="Net 15 Days" className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#64748B] mb-1">State</label>
                  <input required value={supForm.state} onChange={(e) => setSupForm({ ...supForm, state: e.target.value })} className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">State Code</label>
                  <input required minLength={2} maxLength={2} value={supForm.stateCode} onChange={(e) => setSupForm({ ...supForm, stateCode: e.target.value })} className="w-full h-9 px-3 border border-gray-200 rounded-lg font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Address</label>
                <input required value={supForm.address} onChange={(e) => setSupForm({ ...supForm, address: e.target.value })} className="w-full h-9 px-3 border border-gray-200 rounded-lg" />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowSupModal(false)} className="h-9 px-4 rounded-lg bg-gray-100 text-[#172033] font-medium">Cancel</button>
                <button type="submit" className="h-9 px-4 rounded-lg bg-[#2457D6] text-white font-semibold">Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupplyChainView;

