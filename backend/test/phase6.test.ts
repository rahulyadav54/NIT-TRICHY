process.env.NODE_ENV = 'test';
import app from '../src/index.js';
import { InventoryLedgerService } from '../src/modules/inventory/inventoryLedger.service.js';
import { queryOne } from '../src/config/db.js';
import Decimal from 'decimal.js';

async function runPhase6Tests() {
  console.log('🧪 Running Phase 6 Automated Tests (GST Invoicing, Dispatch & Payments)...');

  const server = app.listen(5006);
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
    // 1. Authenticate Admin and Salesman
    const adminLogin = await fetch('http://localhost:5006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@trima.com', password: 'password123' }),
    });
    const { token: adminToken } = await adminLogin.json();

    const salesLogin = await fetch('http://localhost:5006/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'salesman@trima.com', password: 'password123' }),
    });
    const { token: salesToken } = await salesLogin.json();

    // 2. Locate Retailer A, Distributor B, and Murukku 200g
    const retailerA = await queryOne('SELECT id FROM "Customer" WHERE code = $1', ['CUST-001']);
    const distributorB = await queryOne('SELECT id FROM "Customer" WHERE code = $1', ['CUST-002']);
    const product = await queryOne('SELECT id FROM "Product" WHERE code = $1', ['PRD-001']);

    // 3. Create Retailer A Order (150 packets @ ₹50) and Approve
    const orderRes = await fetch('http://localhost:5006/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${salesToken}` },
      body: JSON.stringify({
        customerId: retailerA.id,
        orderNumber: `SO-BENCHMARK-TN-${Date.now()}`,
        items: [{ productId: product.id, quantity: 150 }],
      }),
    });
    const orderData = await orderRes.json();
    const orderId = orderData.data.orderId;

    await fetch(`http://localhost:5006/api/sales/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'APPROVED' }),
    });

    // 4. Generate GST Invoice for Retailer A (Tamil Nadu - Intra-State)
    // Benchmark check:
    // Taxable: ₹7,500.00
    // CGST @ 2.5%: ₹187.50
    // SGST @ 2.5%: ₹187.50
    // Total Invoice: ₹7,875.00
    const invRes = await fetch(`http://localhost:5006/api/invoice/from-order/${orderId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const invData = await invRes.json();
    assert(invRes.status === 201 && invData.success, 'GST Tax Invoice successfully generated from approved order');
    assert(invData.data.isIntraState === true, 'Intra-state GST detected (Tamil Nadu to Tamil Nadu)');
    assert(invData.data.taxableAmount === 7500, `Taxable amount is ₹7,500.00 (actual: ₹${invData.data.taxableAmount})`);
    assert(invData.data.cgst === 187.5, `CGST (2.5%) is ₹187.50 (actual: ₹${invData.data.cgst})`);
    assert(invData.data.sgst === 187.5, `SGST (2.5%) is ₹187.50 (actual: ₹${invData.data.sgst})`);
    assert(invData.data.grandTotal === 7875, `Total Invoice is ₹7,875.00 (actual: ₹${invData.data.grandTotal})`);

    const invoiceId = invData.data.invoiceId;

    // 5. Dispatch 150 Packets against Invoice
    // Pre-dispatch FG stock is 238 packets (50 opening + 188 production)
    // Post-dispatch FG stock must be: 238 - 150 = 88 packets
    const dispatchRes = await fetch('http://localhost:5006/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ invoiceId }),
    });
    const dispatchData = await dispatchRes.json();
    assert(dispatchRes.status === 201 && dispatchData.success, 'Sales dispatch completed and stock deducted');

    const postDispatchStock = await InventoryLedgerService.getCurrentStock(product.id, true);
    assert(
      postDispatchStock.equals(88),
      `Post-dispatch Finished Goods stock matches benchmark: 88 packets (actual: ${postDispatchStock})`
    );

    // 6. Test Duplicate Dispatch Prevention
    const dupDispatchRes = await fetch('http://localhost:5006/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ invoiceId }),
    });
    assert(dupDispatchRes.status === 400, 'Duplicate dispatch on same invoice is blocked with 400');

    // 7. Benchmark Payment Collection: ₹4,000 received against ₹7,875 invoice
    // Expected outstanding balance: ₹3,875.00
    const paymentRes = await fetch('http://localhost:5006/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerId: retailerA.id,
        invoiceId,
        amount: 4000,
        paymentMode: 'NEFT',
        referenceNumber: 'NEFT-AXIS-99281',
      }),
    });
    const paymentData = await paymentRes.json();
    assert(paymentRes.status === 201 && paymentData.success, 'Customer payment of ₹4,000 recorded');
    assert(
      paymentData.data.remainingInvoiceBalance === 3875,
      `Remaining outstanding balance is ₹3,875.00 (actual: ₹${paymentData.data.remainingInvoiceBalance})`
    );

    // 8. Test Overpayment Prevention: Attempting to pay ₹5,000 against remaining ₹3,875 balance
    const overpaymentRes = await fetch('http://localhost:5006/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        customerId: retailerA.id,
        invoiceId,
        amount: 5000,
        paymentMode: 'CASH',
      }),
    });
    assert(overpaymentRes.status === 400, 'Overpayment beyond invoice balance due is blocked with 400');

    // 9. Benchmark Distributor B (Karnataka - Inter-state) Shortage Check
    // Distributor B requests: 120 packets
    // Available finished goods: 88 packets
    // Expected shortage: 32 packets
    // Must block order approval and block invoicing!
    const distOrderRes = await fetch('http://localhost:5006/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${salesToken}` },
      body: JSON.stringify({
        customerId: distributorB.id,
        orderNumber: `SO-DISTRIBUTOR-B-${Date.now()}`,
        items: [{ productId: product.id, quantity: 120 }],
      }),
    });
    const distOrderData = await distOrderRes.json();
    const distOrderId = distOrderData.data.orderId;

    const distApproveRes = await fetch(`http://localhost:5006/api/sales/${distOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const distApproveData = await distApproveRes.json();
    assert(
      distApproveRes.status === 400 && distApproveData.code === 'INSUFFICIENT_STOCK',
      'Distributor B order (120 pkts) is blocked due to 32 pkts shortage'
    );
    assert(distApproveData.details.shortage === 32, 'Accurately reported shortage of 32 packets (120 req - 88 avail)');

    console.log(`\n📊 Phase 6 Test Summary: Passed: ${passed}, Failed: ${failed}`);
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

runPhase6Tests();

