import { useState } from 'react';
import { Factory } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/layouts/AppShell';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ExecutiveDashboard } from '@/pages/dashboards/ExecutiveDashboard';
import { MaterialsInventoryMaster } from '@/pages/master/MaterialsInventoryMaster';
import { OperationsView } from '@/pages/operations/OperationsView';
import { CommercialView } from '@/pages/commercial/CommercialView';
import { ReportsView } from '@/pages/reports/ReportsView';

export function App() {
  const { isAuthenticated, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState('overview');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center text-[#64748B] gap-3">
        <div className="w-11 h-11 rounded-xl bg-[#2457D6] text-white flex items-center justify-center shadow-md animate-pulse">
          <Factory size={22} />
        </div>
        <span className="text-sm font-semibold text-[#172033]">Initializing TRIMA ERP...</span>
        <span className="text-xs text-[#64748B] font-mono">Unit-01 Precision Engine</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentPath) {
      case 'overview':
      case 'alerts-action-center':
        return <ExecutiveDashboard onNavigate={setCurrentPath} />;

      case 'materials-inventory':
      case 'purchases-grn':
      case 'suppliers-directory':
      case 'dispatch-gate-pass':
        return <MaterialsInventoryMaster onNavigate={setCurrentPath} />;

      case 'production-runs':
      case 'bom-recipes':
      case 'stock-movement':
      case 'quality-audit-trail':
        return <OperationsView subView={currentPath} onNavigate={setCurrentPath} />;

      case 'sales-orders':
      case 'customers':
      case 'gst-invoices-eway':
      case 'payments-receivables':
      case 'costing-margins':
        return <CommercialView subView={currentPath} onNavigate={setCurrentPath} />;

      case 'reports-analytics':
      case 'user-management':
      case 'plant-settings':
        return <ReportsView onNavigate={setCurrentPath} />;

      default:
        return <ExecutiveDashboard onNavigate={setCurrentPath} />;
    }
  };

  return (
    <AppShell currentPath={currentPath} onNavigate={setCurrentPath}>
      {renderContent()}
    </AppShell>
  );
}

export default App;
