import { Users2, Settings, ShieldCheck, Building2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const SYSTEM_USERS = [
  { name: 'Sundaram Owner', email: 'owner@trima.com', role: 'OWNER', scope: 'Full Executive Access, Valuation & Approvals' },
  { name: 'Priya Admin', email: 'admin@trima.com', role: 'ADMIN', scope: 'Master Data, Order Approval, GST Invoicing & Dispatch' },
  { name: 'Murugan Supervisor', email: 'production@trima.com', role: 'PRODUCTION_SUPERVISOR', scope: 'BOM Scaling, Production Runs, Raw & Packaging Issues' },
  { name: 'Ravi Salesman', email: 'salesman@trima.com', role: 'SALESMAN', scope: 'Mobile Order Entry & Assigned Customer Portfolio' },
  { name: 'Anand Auditor', email: 'auditor@trima.com', role: 'ACCOUNTANT_AUDITOR', scope: 'Read-Only Compliance, 16 Registers & CSV/Excel Exports' },
];

export function AdminSettingsView({ subView = 'user-management' }: { subView: string }) {
  const { user } = useAuth();

  return (
    <div className="flex flex-col w-full pb-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172033] tracking-tight">
          {subView === 'user-management' ? 'User Management & Role Matrix' : 'Plant Settings & GST Configuration'}
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          {subView === 'user-management'
            ? 'Active RBAC accounts configured for TRIMA ERP Unit-01.'
            : 'Statutory company profile, GSTIN, and production variance tolerance rules.'}
        </p>
      </div>

      {subView === 'user-management' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
              <Users2 size={17} className="text-[#2457D6]" />
              Authorized Enterprise Users (5 Roles)
            </h3>
            <span className="text-xs text-[#0D9488] font-semibold">Signed in as: {user?.role}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="py-2.5 px-4">Name</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Permissions Scope</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {SYSTEM_USERS.map((u) => (
                  <tr key={u.email} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-semibold text-[#172033]">{u.name}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-[#2457D6]">{u.email}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#2457D6] text-xs font-semibold">{u.role}</span>
                    </td>
                    <td className="py-2.5 px-4 text-xs text-[#64748B]">{u.scope}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0D9488]">
                        <ShieldCheck size={13} /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
              <Building2 size={17} className="text-[#2457D6]" />
              Company &amp; GST Identity (Demo)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[#64748B]">Legal Entity</span>
                <span className="font-semibold text-[#172033]">TRIMA Packaged Foods Pvt Ltd</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[#64748B]">GSTIN</span>
                <span className="font-mono font-semibold text-[#2457D6]">33AABCT1234F1Z5</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[#64748B]">Home State</span>
                <span className="font-semibold text-[#172033]">Tamil Nadu (Code: 33)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#64748B]">Plant Address</span>
                <span className="text-right text-[#172033]">B-12, Industrial Estate, Thuvakudi, Trichy</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-base font-semibold text-[#172033] flex items-center gap-2">
              <Settings size={17} className="text-[#0D9488]" />
              Production &amp; Accounting Rules
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[#64748B]">Inventory Valuation</span>
                <span className="font-semibold text-[#172033]">Weighted-Average Cost (WAC)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[#64748B]">Variance Alert Threshold</span>
                <span className="font-mono font-semibold text-amber-600">±3.00%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-[#64748B]">GST Split (Intra vs Inter)</span>
                <span className="font-semibold text-[#172033]">2.5% + 2.5% vs 5.0% IGST</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#64748B]">Negative Stock Policy</span>
                <span className="font-semibold text-red-600">Strictly Blocked (Atomic Ledger)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettingsView;

