import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api';
import { Customer, Product, Supplier, Material } from '@/types';
import {
  Users,
  Package,
  Truck,
  Boxes,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

export function MasterDataPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'suppliers' | 'materials'>('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  const isReadOnly = user?.role === 'ACCOUNTANT_AUDITOR';
  const isSalesman = user?.role === 'SALESMAN';

  const loadData = async () => {
    try {
      const [pRes, cRes, sRes, mRes] = await Promise.all([
        apiRequest<{ data: Product[] }>('/master/products'),
        apiRequest<{ data: Customer[] }>('/master/customers'),
        apiRequest<{ data: Supplier[] }>('/master/suppliers'),
        apiRequest<{ data: Material[] }>('/master/materials'),
      ]);
      setProducts(pRes.data);
      setCustomers(cRes.data);
      setSuppliers(sRes.data);
      setMaterials(mRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-sm">
            UF
          </div>
          <div>
            <h1 className="text-base font-bold">UdyamFlow ERP</h1>
            <p className="text-[10px] text-slate-400">TRIMA • Packaged Snacks Operations</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <span className="text-xs font-semibold text-white block">{user?.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-slate-700">
              ROLE: {user?.role}
            </span>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'products'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Package className="w-4 h-4" />
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'customers'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Customers ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'suppliers'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Truck className="w-4 h-4" />
              Suppliers ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'materials'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Boxes className="w-4 h-4" />
              Materials ({materials.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isReadOnly && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Read-Only Auditor Mode
              </span>
            )}
          </div>
        </div>

        {/* Tab 1: Products */}
        {activeTab === 'products' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Finished Goods Catalogue</h2>
                <p className="text-xs text-slate-500">Products manufactured and distributed by TRIMA</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Code / SKU</th>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">Pack Size</th>
                    <th className="px-6 py-3">Selling Price</th>
                    <th className="px-6 py-3">HSN Code</th>
                    <th className="px-6 py-3">GST Rate</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-semibold text-slate-900">{p.code}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{p.name}</td>
                      <td className="px-6 py-3">{p.packSize}</td>
                      <td className="px-6 py-3 font-semibold text-slate-900">₹{parseFloat(p.sellingPrice.toString()).toFixed(2)}</td>
                      <td className="px-6 py-3 font-mono">{p.hsnCode}</td>
                      <td className="px-6 py-3 font-semibold text-teal-700">{p.gstRate}%</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Customers */}
        {activeTab === 'customers' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Customer Portfolio</h2>
                <p className="text-xs text-slate-500">
                  {isSalesman ? 'Customers assigned to your sales territory' : 'Registered Retailers and Distributors'}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Customer Name</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">GSTIN</th>
                    <th className="px-6 py-3">State</th>
                    <th className="px-6 py-3">Credit Limit</th>
                    <th className="px-6 py-3">Assigned Salesman</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-semibold text-slate-900">{c.code}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{c.name}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          c.type === 'DISTRIBUTOR' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono">{c.gstin}</td>
                      <td className="px-6 py-3">{c.state} ({c.stateCode})</td>
                      <td className="px-6 py-3 font-semibold text-slate-900">₹{parseFloat(c.creditLimit.toString()).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3 text-slate-700">{c.assignedSalesmanName || 'General'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Suppliers */}
        {activeTab === 'suppliers' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Approved Suppliers</h2>
                <p className="text-xs text-slate-500">Raw materials and packaging procurement partners</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Supplier Name</th>
                    <th className="px-6 py-3">GSTIN</th>
                    <th className="px-6 py-3">Contact</th>
                    <th className="px-6 py-3">State</th>
                    <th className="px-6 py-3">Payment Terms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-semibold text-slate-900">{s.code}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{s.name}</td>
                      <td className="px-6 py-3 font-mono">{s.gstin}</td>
                      <td className="px-6 py-3">{s.contactInfo}</td>
                      <td className="px-6 py-3">{s.state} ({s.stateCode})</td>
                      <td className="px-6 py-3 font-semibold text-slate-700">{s.paymentTerms || 'Net 30'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Materials */}
        {activeTab === 'materials' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Material Master & Stock Ledger</h2>
                <p className="text-xs text-slate-500">Raw materials, pouches, and cartons with live ledger balances</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Material Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Unit</th>
                    <th className="px-6 py-3">Purchase Rate</th>
                    <th className="px-6 py-3">Reorder Level</th>
                    <th className="px-6 py-3">Opening Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-semibold text-slate-900">{m.code}</td>
                      <td className="px-6 py-3 font-medium text-slate-800">{m.name}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.category === 'RAW_MATERIAL' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-teal-50 text-teal-700 border border-teal-200'
                        }`}>
                          {m.category}
                        </span>
                      </td>
                      <td className="px-6 py-3 font-mono font-semibold">{m.unit}</td>
                      <td className="px-6 py-3 font-semibold text-slate-900">₹{parseFloat(m.purchaseRate.toString()).toFixed(2)}</td>
                      <td className="px-6 py-3 font-mono">{m.reorderLevel}</td>
                      <td className="px-6 py-3 font-mono font-semibold text-slate-900">{m.openingStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
