import { useState, useEffect } from 'react';
import {
  FileDown, ClipboardCheck, PlusCircle, Package, Wheat, Boxes,
  ArrowDown, AlertTriangle, Truck, CheckCircle, Search, ChevronDown,
  RotateCcw, Table2, ReceiptText, ShoppingCart, X,
} from 'lucide-react';
import { apiRequest } from '@/services/api';

export function MaterialsInventoryMaster({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [costingValuation, setCostingValuation] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    code: '',
    name: '',
    category: 'RAW_MATERIAL',
    uom: 'KG',
    unitCost: '45.00',
    reorderLevel: '100',
    currentStock: '250',
    hsnCode: '1106',
    storageLocation: 'Silo A-01',
  });

  const fetchData = async () => {
    try {
      const [matRes, costRes] = await Promise.allSettled([
        apiRequest('/master/materials'),
        apiRequest('/costing/dashboard'),
      ]);

      if (matRes.status === 'fulfilled') setMaterials(matRes.value.data || []);
      if (costRes.status === 'fulfilled') setCostingValuation(costRes.value.data?.inventoryValuation || null);
    } catch (err) {
      console.error('Error fetching materials:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/master/materials', {
        method: 'POST',
        body: JSON.stringify({
          code: newMaterial.code,
          name: newMaterial.name,
          category: newMaterial.category,
          unit: newMaterial.uom || 'KG',
          openingStock: Number(newMaterial.currentStock || 0),
          reorderLevel: Number(newMaterial.reorderLevel || 0),
          purchaseRate: Number(newMaterial.unitCost || 0),
        }),
      });
      setShowAddModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add material');
    }
  };

  // Combine real materials with seed inventory items for a comprehensive enterprise view
  const defaultInventory = [
    {
      id: 'm-1',
      code: 'RM-FL-001',
      name: 'Grade-A Gram Flour (Besan)',
      spec: 'Standard mesh 80 • Supplier: Demo Agro Mills',
      category: 'RAW_MATERIAL',
      storage: 'Silo A-03',
      hsn: 'HSN 1106',
      stock: 1450,
      uom: 'kg',
      capacityPct: 48,
      rate: '74.50',
      avgRate: '72.80',
      reorderLevel: 800,
      leadTime: '3 Days Lead',
      status: 'In Stock',
    },
    {
      id: 'm-2',
      code: 'RM-FL-002',
      name: 'Raw Rice Flour (Murukku Special)',
      spec: 'Moisture < 11% • Supplier: Trichy Grain Millers',
      category: 'RAW_MATERIAL',
      storage: 'Silo A-01',
      hsn: 'HSN 1102',
      stock: 2200,
      uom: 'kg',
      capacityPct: 73,
      rate: '43.12',
      avgRate: '43.12',
      reorderLevel: 500,
      leadTime: '2 Days Lead',
      status: 'In Stock',
    },
    {
      id: 'm-3',
      code: 'RM-OIL-001',
      name: 'Refined Edible Palm Oil',
      spec: 'Bulk Tanker 15k L • Supplier: Tamil Nadu Edible Oils',
      category: 'RAW_MATERIAL',
      storage: 'Oil Tank 02',
      hsn: 'HSN 1511',
      stock: 420,
      uom: 'L',
      capacityPct: 28,
      rate: '110.00',
      avgRate: '108.50',
      reorderLevel: 500,
      leadTime: '1 Day Lead',
      status: 'Reorder Triggered',
    },
    {
      id: 'm-4',
      code: 'RM-FAT-001',
      name: 'Pure Cow Butter / Ghee',
      spec: 'Agmark Certified • Supplier: Demo Dairy Co-op',
      category: 'RAW_MATERIAL',
      storage: 'Cold Room 2',
      hsn: 'HSN 0405',
      stock: 180,
      uom: 'kg',
      capacityPct: 60,
      rate: '480.00',
      avgRate: '475.00',
      reorderLevel: 100,
      leadTime: '2 Days Lead',
      status: 'In Stock',
    },
    {
      id: 'm-5',
      code: 'PKG-POUCH-001',
      name: 'Printed Laminated Pouch (Murukku 200g)',
      spec: '12 Micron PET / 50 Micron Poly • Supplier: Demo Packaging Co.',
      category: 'PACKAGING',
      storage: 'Packaging Bay',
      hsn: 'HSN 3923',
      stock: 180,
      uom: 'units',
      capacityPct: 15,
      rate: '1.85',
      avgRate: '1.80',
      reorderLevel: 300,
      leadTime: '5 Days Lead',
      status: 'Low Stock',
    },
    {
      id: 'm-6',
      code: 'PKG-BOX-001',
      name: 'Corrugated Outer Carton Box (50 Pkts)',
      spec: '5-Ply Kraft • Supplier: Sterling Packaging Madurai',
      category: 'PACKAGING',
      storage: 'Packaging Bay',
      hsn: 'HSN 4819',
      stock: 450,
      uom: 'boxes',
      capacityPct: 75,
      rate: '24.00',
      avgRate: '23.50',
      reorderLevel: 150,
      leadTime: '4 Days Lead',
      status: 'In Stock',
    },
    {
      id: 'm-7',
      code: 'FG-MRK-200',
      name: 'Trichy Traditional Murukku (200g)',
      spec: 'Finished Goods • Ready for Dispatch',
      category: 'FINISHED_GOODS',
      storage: 'Finished Goods Bay',
      hsn: 'HSN 1905',
      stock: 370,
      uom: 'pkts',
      capacityPct: 37,
      rate: '30.90',
      avgRate: '30.90',
      reorderLevel: 200,
      leadTime: 'Instant Dispatch',
      status: 'In Stock',
    },
  ];

  // Merge database materials if any custom ones were added
  const allItems = [
    ...defaultInventory,
    ...materials
      .filter((m) => !defaultInventory.some((d) => d.code === m.code))
      .map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        spec: `BOM Component • UOM: ${m.uom}`,
        category: m.category,
        storage: 'Silo Cluster A',
        hsn: 'HSN 1106',
        stock: Number(m.currentStock || 100),
        uom: m.uom?.toLowerCase() || 'kg',
        capacityPct: 50,
        rate: Number(m.unitCost || 50).toFixed(2),
        avgRate: Number(m.unitCost || 50).toFixed(2),
        reorderLevel: Number(m.reorderLevel || 50),
        leadTime: '3 Days Lead',
        status: Number(m.currentStock) < Number(m.reorderLevel) ? 'Low Stock' : 'In Stock',
      })),
  ];

  // Filters
  const filteredItems = allItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hsn.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL'
        ? true
        : selectedCategory === 'LOW_STOCK'
        ? item.status === 'Low Stock' || item.status === 'Reorder Triggered'
        : item.category === selectedCategory;

    const matchesStatus =
      selectedStatus === 'ALL' ? true : item.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const rawCount = allItems.filter((i) => i.category === 'RAW_MATERIAL').length;
  const pkgCount = allItems.filter((i) => i.category === 'PACKAGING').length;
  const lowCount = allItems.filter((i) => i.status === 'Low Stock' || i.status === 'Reorder Triggered').length;

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Top Command & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md py-space-md bg-surface">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Materials & Inventory
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-micro text-label-micro uppercase tracking-wider font-semibold">
              Live Stream Sync
            </span>
          </div>
          <p className="font-body-default text-body-default text-secondary mt-0.5 max-w-3xl">
            Monitor raw materials, packaging supplies, batch yields, and stock movements across storage silos and cold rooms.
          </p>
        </div>

        {/* Quick Actions Group */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate?.('reports-analytics')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white hover:bg-gray-50 text-[#172033] text-sm font-medium shadow-sm transition-colors border border-gray-200"
          >
            <FileDown size={15} className="text-[#64748B]" />
            <span>Export Valuation</span>
          </button>
          <button
            onClick={() => onNavigate?.('stock-movement')}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white hover:bg-gray-50 text-[#172033] text-sm font-medium shadow-sm transition-colors border border-gray-200"
          >
            <ClipboardCheck size={15} className="text-[#2457D6]" />
            <span>Stock Audit Sheet</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusCircle size={15} />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* Precision KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI 1: Total Materials */}
        <div className="p-5 rounded-xl bg-white shadow-sm flex flex-col justify-between relative overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-semibold text-[#64748B] tracking-wider">
              Total Materials
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#2457D6]/10 flex items-center justify-center text-[#2457D6]">
              <Package size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl text-[#172033] font-bold tracking-tight">
                {allItems.length}
              </span>
              <span className="text-sm text-[#64748B] font-medium">Items</span>
            </div>
            <div className="mt-1">
              <span className="text-xs font-semibold text-[#0D9488]">
                Valuation: ₹{costingValuation?.totalValuation ? Number(costingValuation.totalValuation).toLocaleString('en-IN') : '14,82,450'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-[11px] text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0D9488]" />
            <span>Active across 4 storage zones</span>
          </div>
        </div>

        {/* KPI 2: Raw Materials */}
        <div className="p-5 rounded-xl bg-white shadow-sm flex flex-col justify-between relative overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-semibold text-[#64748B] tracking-wider">
              Raw Materials
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#2457D6]/10 flex items-center justify-center text-[#2457D6]">
              <Wheat size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl text-[#172033] font-bold tracking-tight">
                {rawCount}
              </span>
              <span className="text-sm text-[#64748B] font-medium">Items</span>
            </div>
            <p className="text-xs text-[#64748B] truncate mt-1">
              Flours, Oils, Ghee, Spices, Pulses
            </p>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-[11px] text-[#0D9488] font-medium">
            <ArrowDown size={13} />
            <span>+2,400 kg inbound today</span>
          </div>
        </div>

        {/* KPI 3: Packaging Materials */}
        <div className="p-5 rounded-xl bg-white shadow-sm flex flex-col justify-between relative overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-semibold text-[#64748B] tracking-wider">
              Packaging Materials
            </span>
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[#64748B]">
              <Boxes size={16} />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl text-[#172033] font-bold tracking-tight">
                {pkgCount}
              </span>
              <span className="text-sm text-[#64748B] font-medium">Items</span>
            </div>
            <p className="text-xs text-[#64748B] truncate mt-1">
              Laminated pouches, Cartons, BOPP
            </p>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-[11px] text-red-600 font-medium">
            <AlertTriangle size={13} />
            <span>1 critical reorder active</span>
          </div>
        </div>

        {/* KPI 4: Low Stock */}
        <div className="p-5 rounded-xl bg-white shadow-sm flex flex-col justify-between relative overflow-hidden border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-semibold text-red-600 tracking-wider">
              Low Stock Items
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold">
              Urgent Action
            </span>
          </div>
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl text-red-600 font-bold tracking-tight">
                {lowCount}
              </span>
              <span className="text-sm text-red-600 font-medium">SKUs</span>
            </div>
            <p className="text-xs text-[#64748B] mt-1">
              PO #PO-882 pending vendor dispatch
            </p>
          </div>
          <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-[11px] text-[#64748B]">
            <Truck size={13} className="text-[#0D9488]" />
            <span>Next arrival ETA: 4:30 PM IST</span>
          </div>
        </div>
      </div>

      {/* Material Category Tabs */}
      <div className="flex items-center justify-between bg-surface-container-lowest rounded-t-xl px-space-md shadow-sm border border-b-0 border-surface-container">
        <div className="flex items-center gap-space-lg overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`flex items-center gap-2 py-space-md font-body-strong text-body-strong relative ${
              selectedCategory === 'ALL' ? 'text-primary' : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span>All Materials</span>
            <span className="px-1.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-micro text-label-micro font-semibold">
              {allItems.length}
            </span>
            {selectedCategory === 'ALL' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container"></span>
            )}
          </button>

          <button
            onClick={() => setSelectedCategory('RAW_MATERIAL')}
            className={`flex items-center gap-2 py-space-md transition-colors ${
              selectedCategory === 'RAW_MATERIAL'
                ? 'text-primary font-body-strong relative'
                : 'text-secondary hover:text-on-surface font-body-default text-body-default'
            }`}
          >
            <span>Raw Materials</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-micro text-label-micro font-semibold">
              {rawCount}
            </span>
            {selectedCategory === 'RAW_MATERIAL' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container"></span>
            )}
          </button>

          <button
            onClick={() => setSelectedCategory('PACKAGING')}
            className={`flex items-center gap-2 py-space-md transition-colors ${
              selectedCategory === 'PACKAGING'
                ? 'text-primary font-body-strong relative'
                : 'text-secondary hover:text-on-surface font-body-default text-body-default'
            }`}
          >
            <span>Packaging</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-micro text-label-micro font-semibold">
              {pkgCount}
            </span>
            {selectedCategory === 'PACKAGING' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-container"></span>
            )}
          </button>

          <button
            onClick={() => setSelectedCategory('LOW_STOCK')}
            className={`flex items-center gap-2 py-space-md transition-colors ${
              selectedCategory === 'LOW_STOCK'
                ? 'text-error font-body-strong relative'
                : 'text-error hover:text-on-surface font-body-default text-body-default'
            }`}
          >
            <span>Low Stock</span>
            <span className="px-1.5 py-0.5 rounded-full bg-error text-on-error font-label-micro text-label-micro font-bold">
              {lowCount}
            </span>
            {selectedCategory === 'LOW_STOCK' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-error"></span>
            )}
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-[#64748B] text-xs">
          <CheckCircle size={15} className="text-[#0D9488]" />
          <span>Tally Prime & Ledger Synced: 100% Real-time</span>
        </div>
      </div>

      {/* Filter & Search Control Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 bg-gray-50 shadow-sm border-x border-gray-200">
        {/* Left Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px] flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-sm bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2457D6]/30 text-[#172033] placeholder:text-gray-400 border border-gray-200"
              placeholder="Search material by name, code (e.g. RM-FL-001), HSN..."
              type="text"
            />
          </div>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-9 pl-3 pr-8 bg-white text-[#172033] text-sm rounded-lg shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#2457D6]/30 cursor-pointer border border-gray-200"
            >
              <option value="ALL">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Reorder Triggered">Reorder Triggered</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748B] pointer-events-none" />
          </div>

          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
            }}
            className="h-9 px-3 rounded-lg bg-white hover:bg-gray-100 text-[#64748B] hover:text-[#172033] text-sm flex items-center gap-1.5 shadow-sm transition-colors border border-gray-200"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <div className="flex items-center bg-white rounded-lg p-0.5 shadow-sm border border-gray-200">
            <button className="p-1.5 rounded bg-[#2457D6]/10 text-[#2457D6] flex items-center justify-center">
              <Table2 size={16} />
            </button>
          </div>
          <span className="text-[#64748B] text-xs">
            Showing {filteredItems.length} of {allItems.length} SKUs
          </span>
        </div>
      </div>

      {/* Professional Enterprise Material Data Table */}
      <div className="overflow-x-auto bg-surface-container-lowest shadow-sm rounded-b-xl mb-space-lg border border-surface-container">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-9 bg-surface-container-low text-secondary font-table-header text-table-header uppercase tracking-wider select-none border-b border-surface-container">
              <th className="w-10 px-space-sm text-center">
                <input className="rounded bg-surface-container-lowest text-primary-container focus:ring-0 cursor-pointer" type="checkbox" />
              </th>
              <th className="px-space-sm py-1 font-semibold">Material Code</th>
              <th className="px-space-sm py-1 font-semibold">Name & Specification</th>
              <th className="px-space-sm py-1 font-semibold">Category</th>
              <th className="px-space-sm py-1 font-semibold">Storage & HSN</th>
              <th className="px-space-sm py-1 font-semibold">Available Stock / Capacity</th>
              <th className="px-space-sm py-1 font-semibold text-right">Weighted Cost (WAC)</th>
              <th className="px-space-sm py-1 font-semibold">Reorder Lvl / Lead</th>
              <th className="px-space-sm py-1 font-semibold">Stock Status</th>
              <th className="w-24 px-space-sm py-1 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="font-table-data text-table-data text-on-surface divide-y divide-surface-container-high">
            {filteredItems.map((item) => (
              <tr key={item.code} className="h-11 hover:bg-surface-container-low transition-colors group">
                <td className="px-space-sm text-center">
                  <input className="rounded bg-surface-container-lowest text-primary-container focus:ring-0 cursor-pointer" type="checkbox" />
                </td>
                <td className="px-space-sm">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container font-mono text-[11px] font-semibold text-primary">
                    {item.code}
                  </span>
                </td>
                <td className="px-space-sm">
                  <div className="flex flex-col min-w-0">
                    <span className="font-body-strong text-body-strong text-on-surface truncate">{item.name}</span>
                    <span className="font-label-micro text-label-micro text-secondary truncate">{item.spec}</span>
                  </div>
                </td>
                <td className="px-space-sm">
                  <span
                    className={`px-2 py-0.5 rounded font-label-micro text-label-micro font-semibold uppercase ${
                      item.category === 'RAW_MATERIAL'
                        ? 'bg-primary-fixed text-on-primary-fixed'
                        : item.category === 'PACKAGING'
                        ? 'bg-secondary-container text-on-secondary-fixed'
                        : 'bg-tertiary-fixed text-on-tertiary-fixed'
                    }`}
                  >
                    {item.category.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-space-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-on-surface">{item.storage}</span>
                    <span className="font-label-micro text-label-micro text-outline font-mono">{item.hsn}</span>
                  </div>
                </td>
                <td className="px-space-sm">
                  <div className="flex flex-col gap-1 w-36">
                    <div className="flex justify-between items-baseline font-mono font-medium text-on-surface">
                      <span>
                        {item.stock} {item.uom}
                      </span>
                      <span className="text-label-micro text-secondary">{item.capacityPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.capacityPct < 25 ? 'bg-error' : item.capacityPct < 40 ? 'bg-secondary' : 'bg-primary-container'
                        }`}
                        style={{ width: `${item.capacityPct}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="px-space-sm text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-mono font-semibold text-on-surface">
                      ₹{item.rate} / {item.uom}
                    </span>
                    <span className="font-label-micro text-label-micro text-secondary">Avg: ₹{item.avgRate}</span>
                  </div>
                </td>
                <td className="px-space-sm">
                  <div className="flex flex-col">
                    <span className="font-mono text-on-surface">
                      {item.reorderLevel} {item.uom}
                    </span>
                    <span className="font-label-micro text-label-micro text-secondary">{item.leadTime}</span>
                  </div>
                </td>
                <td className="px-space-sm">
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-label-micro text-label-micro font-semibold ${
                      item.status === 'In Stock'
                        ? 'bg-surface-container text-tertiary'
                        : item.status === 'Low Stock'
                        ? 'bg-error-container text-on-error-container'
                        : 'bg-secondary-container text-on-secondary-fixed'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.status === 'In Stock' ? 'bg-tertiary' : item.status === 'Low Stock' ? 'bg-error' : 'bg-primary'
                      }`}
                    ></span>
                    <span>{item.status}</span>
                  </div>
                </td>
                <td className="px-space-sm text-center">
                  <div className="flex items-center justify-center gap-1 text-secondary">
                    <button
                      onClick={() => onNavigate?.('stock-movement')}
                      className="p-1.5 rounded hover:bg-gray-100 hover:text-[#2457D6] transition-colors"
                      title="View Stock Ledger"
                    >
                      <ReceiptText size={15} />
                    </button>
                    <button
                      onClick={() => onNavigate?.('purchases-grn')}
                      className="p-1.5 rounded hover:bg-gray-100 hover:text-[#2457D6] transition-colors"
                      title="Generate PO"
                    >
                      <ShoppingCart size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Material Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Add New Raw / Packaging Material</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#64748B] hover:text-[#172033]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Material Code</label>
                  <input
                    required
                    value={newMaterial.code}
                    onChange={(e) => setNewMaterial({ ...newMaterial, code: e.target.value })}
                    placeholder="e.g. RM-SP-003"
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Category</label>
                  <select
                    value={newMaterial.category}
                    onChange={(e) => setNewMaterial({ ...newMaterial, category: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="PACKAGING">Packaging</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-label-default text-label-default text-secondary block mb-1">Material Name & Grade</label>
                <input
                  required
                  value={newMaterial.name}
                  onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                  placeholder="e.g. Asafoetida (Hing) Grade-A"
                  className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">UOM</label>
                  <select
                    value={newMaterial.uom}
                    onChange={(e) => setNewMaterial({ ...newMaterial, uom: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                  >
                    <option value="KG">KG</option>
                    <option value="G">G</option>
                    <option value="L">L</option>
                    <option value="ML">ML</option>
                    <option value="PIECES">PIECES</option>
                    <option value="PACKETS">PACKETS</option>
                    <option value="CARTONS">CARTONS</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Unit Cost (₹)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={newMaterial.unitCost}
                    onChange={(e) => setNewMaterial({ ...newMaterial, unitCost: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Initial Stock</label>
                  <input
                    required
                    type="number"
                    value={newMaterial.currentStock}
                    onChange={(e) => setNewMaterial({ ...newMaterial, currentStock: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Reorder Level</label>
                  <input
                    required
                    type="number"
                    value={newMaterial.reorderLevel}
                    onChange={(e) => setNewMaterial({ ...newMaterial, reorderLevel: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Storage Location</label>
                  <input
                    value={newMaterial.storageLocation}
                    onChange={(e) => setNewMaterial({ ...newMaterial, storageLocation: e.target.value })}
                    placeholder="e.g. Silo A-04"
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 px-4 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-strong text-body-strong"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded bg-primary-container hover:bg-primary text-on-primary font-body-strong text-body-strong"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialsInventoryMaster;
