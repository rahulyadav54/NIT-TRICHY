process.env.NODE_ENV = 'test';
import app from '../src/index.js';

async function runPhase8Tests() {
  console.log('🧪 Running Phase 8 Automated Tests (16 Reports, Audit Trail & Exports)...');

  const server = app.listen(5008);
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate as Auditor
    const auditorLogin = await fetch('http://localhost:5008/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'auditor@trima.com', password: 'password123' }),
    });
    const { token } = await auditorLogin.json();

    // 2. Test All 16 Mandatory Reports
    const endpoints = [
      { url: '/sales-register', name: '1. Sales Register' },
      { url: '/customer-sales', name: '2. Customer-Wise Sales' },
      { url: '/product-sales', name: '3. Product-Wise Sales' },
      { url: '/gst-summary', name: '4. GST Outward Supplies Summary' },
      { url: '/purchase-register', name: '5. Purchase Register' },
      { url: '/raw-material-summary', name: '6. Raw Material Stock Summary' },
      { url: '/packaging-summary', name: '7. Packaging Stock Summary' },
      { url: '/finished-goods-summary', name: '8. Finished Goods Stock Summary' },
      { url: '/stock-ledger', name: '9. Detailed Stock Ledger' },
      { url: '/production-report', name: '10. Production Run Report' },
      { url: '/planned-vs-actual-consumption', name: '11. Planned vs Actual Consumption' },
      { url: '/yield-wastage', name: '12. Yield & Wastage Report' },
      { url: '/product-cost-report', name: '13. Product Cost Report' },
      { url: '/payments-report', name: '14. Payments & Collections Report' },
      { url: '/outstanding-receivables', name: '15. Outstanding Receivables' },
      { url: '/customer-ageing', name: '16. Customer Ageing Report' },
    ];

    for (const ep of endpoints) {
      const res = await fetch(`http://localhost:5008/api/reports${ep.url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      assert(res.status === 200 && data.success, `Report successfully fetched: ${ep.name}`);
    }

    // 3. Test CSV Export
    const csvRes = await fetch('http://localhost:5008/api/reports/export/csv/sales-register', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const csvText = await csvRes.text();
    assert(csvRes.status === 200 && csvText.includes('invoiceNumber'), 'Sales Register CSV exported successfully');

    // 4. Test Excel Export
    const excelRes = await fetch('http://localhost:5008/api/reports/export/excel/sales-register', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(
      excelRes.status === 200 && excelRes.headers.get('content-type')?.includes('spreadsheetml'),
      'Sales Register Excel workbook exported with correct MIME type'
    );

    // 5. Verify Immutable Audit Trail
    const auditRes = await fetch('http://localhost:5008/api/reports/audit-trail', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const auditData = await auditRes.json();
    assert(auditRes.status === 200 && auditData.data.length > 0, 'Audit trail contains logged enterprise transactions');

    console.log(`\n📊 Phase 8 Test Summary: Passed: ${passed}, Failed: ${failed}`);
    server.close();
    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    server.close();
    process.exit(1);
  }
}

runPhase8Tests();

