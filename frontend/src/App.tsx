import { useState, useEffect } from 'react';
import { Factory } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AppShell } from '@/layouts/AppShell';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ExecutiveDashboard } from '@/pages/dashboards/ExecutiveDashboard';
import { RolePortalDashboard } from '@/pages/dashboards/RolePortalDashboard';
import { MaterialsInventoryMaster } from '@/pages/master/MaterialsInventoryMaster';
import { SupplyChainView } from '@/pages/supply/SupplyChainView';
import { OperationsView } from '@/pages/operations/OperationsView';
import { CommercialView } from '@/pages/commercial/CommercialView';
import { ReportsView } from '@/pages/reports/ReportsView';
import { AdminSettingsView } from '@/pages/admin/AdminSettingsView';

const ROLE_ALLOWED_PATHS: Record<string, Set<string>> = {
  OWNER: new Set([
    'overview', 'alerts-action-center', 'production-runs', 'bom-recipes',
    'materials-inventory', 'stock-movement', 'quality-audit-trail',
    'purchases-grn', 'suppliers-directory', 'dispatch-gate-pass',
    'sales-orders', 'customers', 'gst-invoices-eway', 'payments-receivables',
    'costing-margins', 'reports-analytics', 'user-management', 'plant-settings',
  ]),
  ADMIN: new Set([
    'overview', 'alerts-action-center', 'production-runs', 'bom-recipes',
    'materials-inventory', 'stock-movement', 'quality-audit-trail',
    'purchases-grn', 'suppliers-directory', 'dispatch-gate-pass',
    'sales-orders', 'customers', 'gst-invoices-eway', 'payments-receivables',
    'costing-margins', 'reports-analytics', 'user-management', 'plant-settings',
  ]),
  PRODUCTION_SUPERVISOR: new Set([
    'overview', 'alerts-action-center', 'production-runs', 'bom-recipes',
    'materials-inventory', 'stock-movement', 'quality-audit-trail',
    'purchases-grn', 'suppliers-directory',
  ]),
  SALESMAN: new Set(['overview', 'sales-orders', 'customers']),
  ACCOUNTANT_AUDITOR: new Set([
    'overview', 'materials-inventory', 'stock-movement', 'quality-audit-trail',
    'purchases-grn', 'sales-orders', 'customers', 'gst-invoices-eway',
    'payments-receivables', 'costing-margins', 'reports-analytics',
  ]),
};

export function App() {
  const { isAuthenticated, loading, user } = useAuth();
  const [currentPath, setCurrentPath] = useState('overview');

  useEffect(() => {
    setCurrentPath('overview');
  }, [isAuthenticated, user?.id]);

  const navigateSafe = (path: string) => {
    const allowed = ROLE_ALLOWED_PATHS[user?.role || ''] || new Set(['overview']);
    setCurrentPath(allowed.has(path) ? path : 'overview');
  };

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

  const renderOverview = () => {
    if (user?.role === 'OWNER') {
      return <ExecutiveDashboard onNavigate={navigateSafe} />;
    }
    return <RolePortalDashboard onNavigate={navigateSafe} />;
  };

  const renderContent = () => {
    const allowed = ROLE_ALLOWED_PATHS[user?.role || ''] || new Set(['overview']);
    const effectivePath = allowed.has(currentPath) ? currentPath : 'overview';

    switch (effectivePath) {
      case 'overview':
        return renderOverview();
      case 'alerts-action-center':
        return user?.role === 'OWNER'
          ? <ExecutiveDashboard onNavigate={navigateSafe} />
          : <RolePortalDashboard onNavigate={navigateSafe} />;

      case 'materials-inventory':
        return <MaterialsInventoryMaster onNavigate={navigateSafe} />;

      case 'purchases-grn':
      case 'suppliers-directory':
      case 'dispatch-gate-pass':
        return <SupplyChainView subView={effectivePath} onNavigate={navigateSafe} />;

      case 'production-runs':
      case 'bom-recipes':
      case 'stock-movement':
      case 'quality-audit-trail':
        return <OperationsView subView={effectivePath} onNavigate={navigateSafe} />;

      case 'sales-orders':
      case 'customers':
      case 'gst-invoices-eway':
      case 'payments-receivables':
      case 'costing-margins':
        return <CommercialView subView={effectivePath} onNavigate={navigateSafe} />;

      case 'reports-analytics':
        return <ReportsView onNavigate={navigateSafe} />;

      case 'user-management':
      case 'plant-settings':
        return <AdminSettingsView subView={effectivePath} />;

      default:
        return renderOverview();
    }
  };

  return (
    <AppShell currentPath={currentPath} onNavigate={navigateSafe}>
      {renderContent()}
    </AppShell>
  );
}

export default App;
