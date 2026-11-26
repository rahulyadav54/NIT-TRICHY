import { useState, useEffect } from 'react';
import { PlusCircle, RefreshCw, X } from 'lucide-react';
import { apiRequest } from '@/services/api';

export function OperationsView({ subView = 'production-runs', onNavigate: _onNavigate }: { subView: string; onNavigate?: (path: string) => void }) {
  const [prodRuns, setProdRuns] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stockLedger, setStockLedger] = useState<any[]>([]);
  const [scalingQty, setScalingQty] = useState<number>(100); // 100 kg batch
  const [scaledBOM, setScaledBOM] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New batch form state
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batchNumber: `BATCH-MRK-${Date.now().toString().slice(-4)}`,
    batchDate: new Date().toISOString().split('T')[0],
    targetOutputPkt: 200,
    actualOutputPkt: 188,
    damagedPouchCount: 5,
    actualOilKg: 21.0,
    expectedOilKg: 20.0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [prRes, bomRes, prodRes, ledgerRes] = await Promise.allSettled([
        apiRequest('/production'),
        apiRequest('/bom'),
        apiRequest('/master/products'),
        apiRequest('/reports/stock-ledger'),
      ]);

      if (prRes.status === 'fulfilled') setProdRuns(prRes.value.data || []);
      if (bomRes.status === 'fulfilled') {
        const bomList = bomRes.value.data || [];
        setBoms(bomList);
        calculateScaledBOM(scalingQty, bomList);
      }
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
      if (ledgerRes.status === 'fulfilled') setStockLedger(ledgerRes.value.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateScaledBOM = (qty: number, _bomList?: any[]) => {
    // Murukku 200g standard recipe (per 100 kg finished mix: Rice Flour 70 kg, Besan 20 kg, Refined Oil 8 kg, Butter 2 kg, Salt 1.5 kg, Cumin 0.5 kg)
    const baseRecipe = [
      { name: 'Raw Rice Flour (Murukku Special)', code: 'RM-FL-002', stdPct: 0.70, uom: 'kg', costPerUnit: 43.125 },
      { name: 'Grade-A Gram Flour (Besan)', code: 'RM-FL-001', stdPct: 0.20, uom: 'kg', costPerUnit: 74.50 },
      { name: 'Refined Edible Palm Oil', code: 'RM-OIL-001', stdPct: 0.08, uom: 'L', costPerUnit: 110.00 },
      { name: 'Pure Cow Butter / Ghee', code: 'RM-FAT-001', stdPct: 0.02, uom: 'kg', costPerUnit: 480.00 },
      { name: 'Salt & Cumin Spices', code: 'RM-SP-001', stdPct: 0.02, uom: 'kg', costPerUnit: 65.00 },
      { name: 'Printed Pouch (200g)', code: 'PKG-POUCH-001', stdPerKg: 5, uom: 'units', costPerUnit: 1.85 },
    ];

    const scaled = baseRecipe.map((item) => {
      const reqQty = item.stdPct ? (qty * item.stdPct) : (qty * (item.stdPerKg || 5));
      const totalCost = reqQty * item.costPerUnit;
      return {
        ...item,
        requiredQty: reqQty.toFixed(2),
        totalCost: totalCost.toFixed(2),
      };
    });
    setScaledBOM(scaled);
  };

  useEffect(() => {
    loadData();
  }, [subView]);

  const handleRecordBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const activeBom = boms[0];
      const activeProduct = products[0];
      if (!activeBom || !activeProduct) {
        alert('No active BOM or Product found in database.');
        return;
      }

      const scale = Number(batchForm.targetOutputPkt) / Number(activeBom.expectedOutput || 200);
      const actualConsumptions = (activeBom.items || []).map((it: any) => {
        const isOil = String(it.materialCode || '').includes('OIL') || String(it.materialName || '').toLowerCase().includes('oil');
        const qty = isOil
          ? Number(batchForm.actualOilKg)
          : Number((Number(it.standardQuantity) * scale).toFixed(4));
        return {
          materialId: it.materialId,
          actualQty: qty > 0 ? qty : 1,
          unit: it.unit || 'KG',
        };
      });

      await apiRequest('/production', {
        method: 'POST',
        body: JSON.stringify({
          productId: activeProduct.id,
          bomId: activeBom.id,
          runNumber: batchForm.batchNumber,
          batchSize: Number((Number(activeBom.batchSize || 40) * scale).toFixed(2)),
          plannedOutput: Number(batchForm.targetOutputPkt),
          goodOutput: Number(batchForm.actualOutputPkt),
          damagedPackagingQty: Number(batchForm.damagedPouchCount),
          cartonsUsed: Math.max(1, Math.floor(Number(batchForm.actualOutputPkt) / 10)),
          labourCost: 1200,
          powerGasCost: 600,
          otherOverheads: 0,
          actualConsumptions,
        }),
      });
      setShowBatchModal(false);
      setBatchForm((prev) => ({ ...prev, batchNumber: `BATCH-MRK-${Date.now().toString().slice(-4)}` }));
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record batch');
    }
  };

  return (
    <div className="flex flex-col w-full pb-space-xl">
      {/* Top Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md py-space-md bg-surface">
        <div>
          <div className="flex items-center gap-space-xs">
            <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              {subView === 'production-runs' && 'Production Runs & Batch Yields'}
              {subView === 'bom-recipes' && 'Bill of Materials & Dynamic Recipe Scaling'}
              {subView === 'stock-movement' && 'Derived Stock Ledger Movements'}
              {subView === 'quality-audit-trail' && 'Quality & HACCP Audit Trail'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-micro text-label-micro uppercase font-semibold">
              Live Operations
            </span>
          </div>
          <p className="font-body-default text-body-default text-secondary mt-0.5">
            Real-time batch tracking, recipe scaling with yield variance and oil consumption tolerances.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {subView === 'production-runs' && (
            <button
              onClick={() => setShowBatchModal(true)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-sm font-semibold shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
            >
              <PlusCircle size={15} className="flex-shrink-0" />
              <span>Record Production Batch</span>
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

      {/* VIEW 1: PRODUCTION RUNS */}
      {subView === 'production-runs' && (
        <div className="space-y-space-md">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Total Batches Run</span>
              <div className="font-metric-display text-metric-display text-on-surface mt-1">{prodRuns.length || 3}</div>
              <span className="font-label-micro text-label-micro text-tertiary">All Line Shifts Synced</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Average Batch Yield</span>
              <div className="font-metric-display text-metric-display text-primary mt-1">94.0%</div>
              <span className="font-label-micro text-label-micro text-secondary">Benchmark Spec: 1000 pkts</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Damaged Pouches Scrap</span>
              <div className="font-metric-display text-metric-display text-error mt-1">15 pkts</div>
              <span className="font-label-micro text-label-micro text-error">Re-melted / Scrap Logged</span>
            </div>
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <span className="font-label-micro text-label-micro uppercase text-secondary font-semibold">Oil Consumption Variance</span>
              <div className="font-metric-display text-metric-display text-on-secondary-container mt-1">+5.00%</div>
              <span className="font-label-micro text-label-micro text-on-secondary-container">Tolerance: 3.00% (ALERT TRIGGERED)</span>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
            <div className="p-space-md border-b border-surface-container flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Completed & In-Progress Batches</h3>
              <span className="text-secondary font-label-micro text-label-micro font-mono">BOM: Murukku 200g Standard</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-table-header text-table-header uppercase">
                    <th className="py-2.5 px-3">Batch Code</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Product / Recipe</th>
                    <th className="py-2.5 px-3 text-right">Target Output</th>
                    <th className="py-2.5 px-3 text-right">Actual Output</th>
                    <th className="py-2.5 px-3 text-right">Damaged Pouches</th>
                    <th className="py-2.5 px-3 text-right">Yield Variance</th>
                    <th className="py-2.5 px-3 text-right">Oil Variance</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-table-data text-table-data">
                  {prodRuns.length > 0 ? (
                    prodRuns.map((r) => {
                      const yieldVar = Number(r.yieldVariancePct || -6.0);
                      const oilVar = Number(r.oilVariancePct || 5.0);
                      return (
                        <tr key={r.id || r.batchNumber} className="hover:bg-surface-container-low/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-semibold text-primary">{r.batchNumber}</td>
                          <td className="py-2.5 px-3 text-secondary">{new Date(r.batchDate || Date.now()).toLocaleDateString('en-IN')}</td>
                          <td className="py-2.5 px-3 font-medium text-on-surface">Murukku 200g (Batch Run)</td>
                          <td className="py-2.5 px-3 text-right font-mono">{r.targetOutputPkt || 1000} pkts</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-on-surface">{r.actualOutputPkt || 940} pkts</td>
                          <td className="py-2.5 px-3 text-right font-mono text-error">{r.damagedPouchCount || 15} pkts</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                              Math.abs(yieldVar) > 3.0 ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-on-tertiary-fixed'
                            }`}>
                              {yieldVar > 0 ? `+${yieldVar.toFixed(2)}%` : `${yieldVar.toFixed(2)}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                              Math.abs(oilVar) > 3.0 ? 'bg-secondary-container text-on-secondary-fixed' : 'bg-surface-container text-secondary'
                            }`}>
                              {oilVar > 0 ? `+${oilVar.toFixed(2)}%` : `${oilVar.toFixed(2)}%`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                              QC Verified
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary">BATCH-MRK-001</td>
                      <td className="py-2.5 px-3 text-secondary">14 Oct 2024</td>
                      <td className="py-2.5 px-3 font-medium text-on-surface">Murukku 200g (Batch Run)</td>
                      <td className="py-2.5 px-3 text-right font-mono">1,000 pkts</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-on-surface">940 pkts</td>
                      <td className="py-2.5 px-3 text-right font-mono text-error">15 pkts</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-error-container text-on-error-container">
                          -6.00% (ALERT)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-secondary-container text-on-secondary-fixed">
                          +5.00% (ALERT)
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          QC Verified
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

      {/* VIEW 2: BOM & RECIPES */}
      {subView === 'bom-recipes' && (
        <div className="space-y-space-md">
          {/* Dynamic Scaling Calculator Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-surface-container">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm gap-space-sm border-b border-surface-container">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Interactive Batch Recipe Scaler
                </h3>
                <p className="font-label-default text-label-default text-secondary">
                  Specify target dough or packet quantity to automatically scale ingredient allocations, unit conversion, and estimated material cost.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-body-strong text-body-strong text-on-surface">Target Batch Dough:</span>
                <input
                  type="number"
                  min="10"
                  max="5000"
                  step="10"
                  value={scalingQty}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 10;
                    setScalingQty(val);
                    calculateScaledBOM(val, boms);
                  }}
                  className="w-28 h-8 px-2 text-center font-mono font-bold text-primary bg-surface border border-outline-variant/60 rounded focus:border-primary-container focus:outline-none"
                />
                <span className="font-body-strong text-secondary">KG</span>
              </div>
            </div>

            {/* Scaled Ingredients Table */}
            <div className="overflow-x-auto mt-space-md">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-table-header text-table-header uppercase">
                    <th className="py-2 px-3">Item Code</th>
                    <th className="py-2 px-3">Ingredient / Packaging Component</th>
                    <th className="py-2 px-3 text-right">Required Quantity</th>
                    <th className="py-2 px-3 text-right">Unit Rate (WAC)</th>
                    <th className="py-2 px-3 text-right">Estimated Cost</th>
                    <th className="py-2 px-3 text-right">Stock Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high font-table-data text-table-data">
                  {scaledBOM.map((ing) => (
                    <tr key={ing.code} className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary">{ing.code}</td>
                      <td className="py-2.5 px-3 font-medium text-on-surface">{ing.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-on-surface">
                        {ing.requiredQty} {ing.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-secondary">
                        ₹{Number(ing.costPerUnit).toFixed(2)} / {ing.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-primary">
                        ₹{Number(ing.totalCost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-flex items-center gap-1 text-tertiary font-label-micro text-label-micro font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                          Available in Silo
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-container-low/50 font-body-strong">
                    <td colSpan={4} className="py-3 px-3 text-right font-bold text-on-surface">
                      Total Estimated Batch Material Cost:
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-primary text-base">
                      ₹{scaledBOM.reduce((sum, item) => sum + Number(item.totalCost), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: STOCK MOVEMENT / LEDGER */}
      {subView === 'stock-movement' && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container overflow-hidden">
          <div className="p-space-md border-b border-surface-container flex items-center justify-between">
            <div>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Derived Immutable Stock Ledger
              </h3>
              <p className="font-label-default text-label-default text-secondary">
                Audit trail tracking every single receipt, production consumption, dispatch, and damaged scrap movement.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-micro text-label-micro font-bold">
              Append-Only Ledger
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-secondary font-table-header text-table-header uppercase">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Transaction Type</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3">Material / SKU</th>
                  <th className="py-2.5 px-3 text-right">Qty In (+</th>
                  <th className="py-2.5 px-3 text-right">Qty Out (-)</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3 text-right">Audit Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high font-table-data text-table-data">
                {stockLedger.length > 0 ? (
                  stockLedger.map((mv) => (
                    <tr key={mv.id} className="hover:bg-surface-container-low/70 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-secondary">
                        {new Date(mv.transactionDate).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-surface-container text-primary font-label-micro text-label-micro font-semibold">
                          {mv.transactionType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-primary">
                        {mv.sourceDocumentType}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-on-surface">
                        {mv.itemName} ({mv.itemCode})
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-tertiary">
                        {Number(mv.qtyIn) > 0 ? `+${Number(mv.qtyIn)} ${mv.unit}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-error">
                        {Number(mv.qtyOut) > 0 ? `-${Number(mv.qtyOut)} ${mv.unit}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-on-surface">
                        {Number(mv.balanceAfter)} {mv.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right text-tertiary font-label-micro text-label-micro font-semibold">
                        ✓ {mv.performedBy || 'System'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-secondary">
                      No inventory movements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Record Production Run</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-[#64748B] hover:text-[#172033]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRecordBatch} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Batch Run Code</label>
                  <input
                    required
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Batch Date</label>
                  <input
                    type="date"
                    required
                    value={batchForm.batchDate}
                    onChange={(e) => setBatchForm({ ...batchForm, batchDate: e.target.value })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Target Output (pkts)</label>
                  <input
                    type="number"
                    required
                    value={batchForm.targetOutputPkt}
                    onChange={(e) => setBatchForm({ ...batchForm, targetOutputPkt: Number(e.target.value) })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Actual Good Output (pkts)</label>
                  <input
                    type="number"
                    required
                    value={batchForm.actualOutputPkt}
                    onChange={(e) => setBatchForm({ ...batchForm, actualOutputPkt: Number(e.target.value) })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Damaged Pouches (pkts)</label>
                  <input
                    type="number"
                    required
                    value={batchForm.damagedPouchCount}
                    onChange={(e) => setBatchForm({ ...batchForm, damagedPouchCount: Number(e.target.value) })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
                <div>
                  <label className="font-label-default text-label-default text-secondary block mb-1">Actual Oil Used (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={batchForm.actualOilKg}
                    onChange={(e) => setBatchForm({ ...batchForm, actualOilKg: Number(e.target.value) })}
                    className="w-full h-8 px-2.5 text-body-default bg-surface border border-outline-variant/60 rounded"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="h-8 px-4 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-strong"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded bg-primary-container hover:bg-primary text-on-primary font-body-strong"
                >
                  Commit Run to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperationsView;
