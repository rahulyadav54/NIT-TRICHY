import { useState } from 'react';
import { FileSpreadsheet, FileDown, CheckCircle, Download } from 'lucide-react';
import { getAuthToken } from '@/services/api';

export function ReportsView({ onNavigate: _onNavigate }: { onNavigate?: (path: string) => void }) {
  const [selectedRegister, setSelectedRegister] = useState('sales-register');
  const [startDate, setStartDate] = useState('2024-10-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [exporting, setExporting] = useState(false);

  const registers = [
    { id: 'production-report', name: 'Production & Yield Register', category: 'OPERATIONS', desc: 'Batch runs, good output, scrap pouches, and ingredient variances' },
    { id: 'planned-vs-actual-consumption', name: 'Oil & Material Consumption Variance', category: 'OPERATIONS', desc: 'Expected vs actual cooking oil & raw material usage with tolerance flags' },
    { id: 'yield-wastage', name: 'Damaged Pouch & Scrap Register', category: 'OPERATIONS', desc: 'Damaged packaging pouches and batch wastage analysis' },
    { id: 'stock-ledger', name: 'Stock Movement Ledger (Audit)', category: 'SUPPLY_CHAIN', desc: 'Derived inventory balances from receipts, issues, and dispatches' },
    { id: 'purchase-register', name: 'Raw Material Inward Receipts (GRN)', category: 'SUPPLY_CHAIN', desc: 'Goods receipts with supplier details and weighted average cost' },
    { id: 'packaging-summary', name: 'Packaging Materials Stock Register', category: 'SUPPLY_CHAIN', desc: 'Laminated film rolls, pouches, and outer corrugated cartons' },
    { id: 'sales-register', name: 'Sales Register', category: 'COMMERCIAL', desc: 'Wholesale and retail sales orders with snapshot pricing' },
    { id: 'outstanding-receivables', name: 'Customer Outstanding & Receivables', category: 'COMMERCIAL', desc: 'Aging report of unpaid customer invoices' },
    { id: 'gst-summary', name: 'GST Outward Supplies (GSTR-1 Register)', category: 'FINANCE', desc: 'State-wise breakdown: Intra-state CGST+SGST vs Inter-state IGST' },
    { id: 'raw-material-summary', name: 'Raw Material Stock Summary', category: 'FINANCE', desc: 'Current raw material stock balances and reorder status' },
    { id: 'product-cost-report', name: 'Batch Costing & Margin Register', category: 'FINANCE', desc: 'Unit cost per good packet, absorption costing, and gross margins' },
    { id: 'finished-goods-summary', name: 'Finished Goods Stock Summary', category: 'FINANCE', desc: 'Available finished goods inventory ready for dispatch' },
    { id: 'payments-report', name: 'Payments & Collections Report', category: 'AUDIT', desc: 'Customer payment receipts across CASH, NEFT, RTGS, UPI' },
    { id: 'audit-trail', name: 'Immutable User Audit Trail Log', category: 'AUDIT', desc: 'Timestamped user actions, logins, approvals, and stock adjustments' },
  ];

  const handleExport = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      const token = getAuthToken();
      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const endpoint = `/api/reports/export/${format}/${selectedRegister}?startDate=${startDate}&endDate=${endDate}`;

      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedRegister}_${startDate}_to_${endDate}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-8 space-y-6">
      {/* Top Header Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
              Statutory Registers & Audit Reports
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#2457D6]/10 text-[#2457D6] text-xs font-semibold uppercase">
              14 Modules Synced
            </span>
          </div>
          <p className="text-sm text-[#64748B] mt-1">
            NIT Trichy benchmark audit compliance, GSTR-1, batch cost breakdown, and raw material ledgers.
          </p>
        </div>

        {/* Date Filter & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm text-xs">
            <span className="text-[#64748B] font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="font-mono text-[#172033] bg-transparent focus:outline-none"
            />
            <span className="text-[#64748B] font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="font-mono text-[#172033] bg-transparent focus:outline-none"
            />
          </div>

          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white hover:bg-gray-50 text-[#172033] text-sm font-medium shadow-sm transition-colors border border-gray-200"
          >
            <FileSpreadsheet size={15} className="text-[#0D9488]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => handleExport('excel')}
            disabled={exporting}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#2457D6] hover:bg-[#1a3fa8] text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <FileDown size={15} />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Grid of Registers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {registers.map((reg) => {
          const isSelected = selectedRegister === reg.id;
          return (
            <div
              key={reg.id}
              onClick={() => setSelectedRegister(reg.id)}
              className={`p-5 rounded-xl shadow-sm cursor-pointer transition-all border flex flex-col justify-between bg-white ${
                isSelected
                  ? 'border-[#2457D6] ring-2 ring-[#2457D6]/20 shadow-md'
                  : 'border-gray-100 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-[11px] font-semibold uppercase text-[#64748B]">
                    {reg.category}
                  </span>
                  {isSelected && (
                    <CheckCircle size={18} className="text-[#2457D6]" />
                  )}
                </div>
                <h4 className="text-sm font-semibold text-[#172033]">{reg.name}</h4>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{reg.desc}</p>
              </div>

              <div className="flex items-center justify-between pt-3 mt-4 border-t border-gray-100 text-[#64748B] text-xs">
                <span>Filterable Date Range</span>
                <span className="font-semibold text-[#2457D6] flex items-center gap-1">
                  Download <Download size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReportsView;
