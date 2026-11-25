process.env.NODE_ENV = 'test';
import app from '../src/index.js';
import { resetAndSeedBenchmark } from '../prisma/reset.js';
import { InventoryLedgerService } from '../src/modules/inventory/inventoryLedger.service.js';
import { queryOne } from '../src/config/db.js';
import Decimal from 'decimal.js';

async function runMasterBenchmarkE2E() {
  console.log('================================================================');
  console.log('🏛️  NIT TIRUCHIRAPPALLI WINTER INTERNSHIP BENCHMARK E2E SUITE');
  console.log('    TRIMA ERP - Trichy Integrated Manufacturing & Audit');
  console.log('================================================================\n');

  // Step 0: Clean Reset & Reseed
  await resetAndSeedBenchmark();

  const server = app.listen(5010);
  const results: { test: string; expected: any; actual: any; pass: boolean }[] = [];

  function record(test: string, expected: any, actual: any, pass: boolean) {
    results.push({ test, expected, actual, pass });
    if (pass) {
      console.log(`  ✅ PASS: ${test}`);
    } else {
      console.error(`  ❌ FAIL: ${test} | Expected: ${expected}, Actual: ${actual}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // PHASE A: OPENING STOCK INITIALIZATION
    // -------------------------------------------------------------
    console.log('\n--- PHASE A: OPENING STOCK INITIALIZATION ---');
    const flour = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-FLOUR']);
    const oil = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-OIL']);
    const spice = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-SPICE']);
    const pouch = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['PKG-POUCH-200G']);
    const carton = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['PKG-CARTON-20']);
    const product = await queryOne('SELECT id FROM "Product" WHERE code = $1', ['PRD-001']);
    const retailerA = await queryOne('SELECT id FROM "Customer" WHERE code = $1', ['CUST-001']);
    const distributorB = await queryOne('SELECT id FROM "Customer" WHERE code = $1', ['CUST-002']);
    const supplier = await queryOne('SELECT id FROM "Supplier" WHERE code = $1', ['SUPP-001']);
    const bom = await queryOne('SELECT id FROM "BOM" WHERE "productId" = $1', [product.id]);

    await InventoryLedgerService.recordMovement({ materialId: flour.id, category: 'RAW_MATERIAL', transactionType: 'OPENING_STOCK', qtyIn: 100, unit: 'KG', sourceDocumentType: 'OPENING', sourceDocumentId: 'INIT-FLOUR' });
    await InventoryLedgerService.recordMovement({ materialId: oil.id, category: 'RAW_MATERIAL', transactionType: 'OPENING_STOCK', qtyIn: 30, unit: 'L', sourceDocumentType: 'OPENING', sourceDocumentId: 'INIT-OIL' });
    await InventoryLedgerService.recordMovement({ materialId: spice.id, category: 'RAW_MATERIAL', transactionType: 'OPENING_STOCK', qtyIn: 5, unit: 'KG', sourceDocumentType: 'OPENING', sourceDocumentId: 'INIT-SPICE' });
    await InventoryLedgerService.recordMovement({ materialId: pouch.id, category: 'PACKAGING', transactionType: 'OPENING_STOCK', qtyIn: 500, unit: 'PIECES', sourceDocumentType: 'OPENING', sourceDocumentId: 'INIT-POUCH' });
    await InventoryLedgerService.recordMovement({ materialId: carton.id, category: 'PACKAGING', transactionType: 'OPENING_STOCK', qtyIn: 30, unit: 'PIECES', sourceDocumentType: 'OPENING', sourceDocumentId: 'INIT-CARTON' });
    await InventoryLedgerService.recordMovement({ productId: product.id, category: 'FINISHED_GOODS', transactionType: 'OPENING_STOCK', qtyIn: 50, unit: 'PACKETS', sourceDocumentType: 'OPENING', sourceDocumentId: 'INIT-FG' });

    const opFlour = await InventoryLedgerService.getCurrentStock(flour.id);
    const opOil = await InventoryLedgerService.getCurrentStock(oil.id);
    const opSpice = await InventoryLedgerService.getCurrentStock(spice.id);
    const opPouch = await InventoryLedgerService.getCurrentStock(pouch.id);
    const opCarton = await InventoryLedgerService.getCurrentStock(carton.id);
    const opFg = await InventoryLedgerService.getCurrentStock(product.id, true);

    record('Opening Flour Stock', 100, opFlour.toNumber(), opFlour.equals(100));
    record('Opening Oil Stock', 30, opOil.toNumber(), opOil.equals(30));
    record('Opening Spice Stock', 5, opSpice.toNumber(), opSpice.equals(5));
    record('Opening Pouch Stock', 500, opPouch.toNumber(), opPouch.equals(500));
    record('Opening Carton Stock', 30, opCarton.toNumber(), opCarton.equals(30));
    record('Opening Finished Goods Stock', 50, opFg.toNumber(), opFg.equals(50));

    // -------------------------------------------------------------
    // PHASE B: BENCHMARK PURCHASE
    // Purchase 60 kg flour @ ₹45/kg -> Expected flour: 160 kg
    // -------------------------------------------------------------
    console.log('\n--- PHASE B: BENCHMARK PURCHASE ---');
    const adminLogin = await fetch('http://localhost:5010/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@trima.com', password: 'password123' }),
    });
    const { token: adminToken } = await adminLogin.json();

    const purchaseRes = await fetch('http://localhost:5010/api/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        supplierId: supplier.id,
        poNumber: 'PO-BENCHMARK-60KG',
        status: 'RECEIVED',
        items: [{ materialId: flour.id, orderedQty: 60, receivedQty: 60, unitRate: 45, unit: 'KG' }],
      }),
    });
    record('Purchase API Response', 201, purchaseRes.status, purchaseRes.status === 201);

    const postPurchFlour = await InventoryLedgerService.getCurrentStock(flour.id);
    record('Post-Purchase Flour Stock', 160, postPurchFlour.toNumber(), postPurchFlour.equals(160));

    // -------------------------------------------------------------
    // PHASE C: BENCHMARK PRODUCTION
    // Actual: Flour 40kg, Oil 10.5L, Spice 1.2kg, Good 188, Damaged 6, Cartons 9
    // -------------------------------------------------------------
    console.log('\n--- PHASE C: BENCHMARK PRODUCTION RUN ---');
    const prodRes = await fetch('http://localhost:5010/api/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        productId: product.id,
        bomId: bom.id,
        runNumber: 'PR-BENCHMARK-FINAL-001',
        batchSize: 200,
        plannedOutput: 200,
        goodOutput: 188,
        damagedPackagingQty: 6,
        cartonsUsed: 9,
        labourCost: 1200,
        powerGasCost: 600,
        otherOverheads: 0,
        actualConsumptions: [
          { materialId: flour.id, actualQty: 40, unit: 'KG' },
          { materialId: oil.id, actualQty: 10.5, unit: 'L' },
          { materialId: spice.id, actualQty: 1.2, unit: 'KG' },
        ],
      }),
    });
    const prodData = await prodRes.json();
    record('Production Run API Response', 201, prodRes.status, prodRes.status === 201);

    // Variances
    record('Yield Variance %', -6, prodData.data.yieldVariancePct, prodData.data.yieldVariancePct === -6);
    record('Yield Warning Triggered (> 3%)', true, prodData.data.yieldWarning, prodData.data.yieldWarning === true);
    record('Oil Consumption Warning Triggered (> 3%)', true, prodData.data.hasMaterialVarianceWarning, prodData.data.hasMaterialVarianceWarning === true);

    // Closing stocks post production
    const stFlour = await InventoryLedgerService.getCurrentStock(flour.id);
    const stOil = await InventoryLedgerService.getCurrentStock(oil.id);
    const stSpice = await InventoryLedgerService.getCurrentStock(spice.id);
    const stPouch = await InventoryLedgerService.getCurrentStock(pouch.id);
    const stCarton = await InventoryLedgerService.getCurrentStock(carton.id);
    const stFg = await InventoryLedgerService.getCurrentStock(product.id, true);

    record('Post-Production Flour Stock', 120, stFlour.toNumber(), stFlour.equals(120));
    record('Post-Production Oil Stock', 19.5, stOil.toNumber(), stOil.equals(19.5));
    record('Post-Production Spice Stock', 3.8, stSpice.toNumber(), stSpice.equals(3.8));
    record('Post-Production Pouch Stock', 306, stPouch.toNumber(), stPouch.equals(306));
    record('Post-Production Carton Stock', 21, stCarton.toNumber(), stCarton.equals(21));
    record('Post-Production Finished Goods Stock', 238, stFg.toNumber(), stFg.equals(238));

    // -------------------------------------------------------------
    // PHASE D: SALESMAN A (RETAILER A - TAMIL NADU)
    // 150 pkts @ ₹50 -> Taxable ₹7500, CGST ₹187.50, SGST ₹187.50, Total ₹7875
    // Dispatch 150 pkts -> Remaining FG: 88 pkts
    // -------------------------------------------------------------
    console.log('\n--- PHASE D: SALESMAN A (RETAILER A) & DISPATCH ---');
    const salesLogin = await fetch('http://localhost:5010/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'salesman@trima.com', password: 'password123' }),
    });
    const { token: salesToken } = await salesLogin.json();

    const orderRes = await fetch('http://localhost:5010/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${salesToken}` },
      body: JSON.stringify({
        customerId: retailerA.id,
        orderNumber: 'SO-BENCHMARK-RETAILER-A',
        items: [{ productId: product.id, quantity: 150 }],
      }),
    });
    const orderData = await orderRes.json();
    const orderId = orderData.data.orderId;

    await fetch(`http://localhost:5010/api/sales/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'APPROVED' }),
    });

    const invRes = await fetch(`http://localhost:5010/api/invoice/from-order/${orderId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const invData = await invRes.json();
    const invoiceId = invData.data.invoiceId;

    record('Retailer A Taxable Amount', 7500, invData.data.taxableAmount, invData.data.taxableAmount === 7500);
    record('Retailer A CGST (2.5%)', 187.5, invData.data.cgst, invData.data.cgst === 187.5);
    record('Retailer A SGST (2.5%)', 187.5, invData.data.sgst, invData.data.sgst === 187.5);
    record('Retailer A Grand Total Invoice', 7875, invData.data.grandTotal, invData.data.grandTotal === 7875);

    await fetch('http://localhost:5010/api/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ invoiceId }),
    });

    const postDispatchFg = await InventoryLedgerService.getCurrentStock(product.id, true);
    record('Post-Dispatch Remaining Finished Goods', 88, postDispatchFg.toNumber(), postDispatchFg.equals(88));

    // -------------------------------------------------------------
    // PHASE E: PAYMENT COLLECTION
    // Record payment ₹4000 -> Expected outstanding: ₹3875
    // -------------------------------------------------------------
    console.log('\n--- PHASE E: PAYMENT COLLECTION ---');
    const payRes = await fetch('http://localhost:5010/api/payment', {
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
    const payData = await payRes.json();
    record('Customer Outstanding Balance', 3875, payData.data.remainingInvoiceBalance, payData.data.remainingInvoiceBalance === 3875);

    // -------------------------------------------------------------
    // PHASE F: SALESMAN B (DISTRIBUTOR B - KARNATAKA)
    // 120 pkts requested, 88 pkts available -> Shortage 32 pkts -> Blocked
    // -------------------------------------------------------------
    console.log('\n--- PHASE F: DISTRIBUTOR B SHORTAGE CHECK ---');
    const distOrderRes = await fetch('http://localhost:5010/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${salesToken}` },
      body: JSON.stringify({
        customerId: distributorB.id,
        orderNumber: 'SO-BENCHMARK-DISTRIBUTOR-B',
        items: [{ productId: product.id, quantity: 120 }],
      }),
    });
    const distOrderData = await distOrderRes.json();

    const distApproveRes = await fetch(`http://localhost:5010/api/sales/${distOrderData.data.orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const distApproveData = await distApproveRes.json();

    record('Distributor B Order Approval Blocked', 400, distApproveRes.status, distApproveRes.status === 400);
    record('Shortage Reported Accurately', 32, distApproveData.details?.shortage, distApproveData.details?.shortage === 32);

    console.log('\n================================================================');
    console.log(`📊 FINAL BENCHMARK SUMMARY: Total: ${results.length}, Passed: ${results.filter(r => r.pass).length}, Failed: ${results.filter(r => !r.pass).length}`);
    console.log('================================================================');

    server.close();
    if (results.some(r => !r.pass)) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Benchmark execution error:', err);
    server.close();
    process.exit(1);
  }
}

runMasterBenchmarkE2E();

