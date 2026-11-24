process.env.NODE_ENV = 'test';
import app from '../src/index.js';
import { InventoryLedgerService } from '../src/modules/inventory/inventoryLedger.service.js';
import { queryOne } from '../src/config/db.js';
import Decimal from 'decimal.js';

async function runPhase4Tests() {
  console.log('🧪 Running Phase 4 Automated Tests (Production Management & Variance Analysis)...');

  const server = app.listen(5004);
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
    // 1. Authenticate as Production Supervisor
    const loginRes = await fetch('http://localhost:5004/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'production@trima.com', password: 'password123' }),
    });
    const { token } = await loginRes.json();

    // 2. Fetch master items
    const product = await queryOne('SELECT id FROM "Product" WHERE code = $1', ['PRD-001']);
    const bom = await queryOne('SELECT id FROM "BOM" WHERE "productId" = $1 AND "isActive" = true', [product.id]);
    const flour = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-FLOUR']);
    const oil = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-OIL']);
    const spice = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-SPICE']);
    const pouch = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['PKG-POUCH-200G']);
    const carton = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['PKG-CARTON-20']);

    // 3. Ensure Benchmark Starting Stocks
    // Flour: 160 KG (100 opening + 60 purchase from Phase 3)
    // Oil: 30 L Opening
    // Spice: 5 KG Opening
    // Pouches: 500 pcs Opening
    // Cartons: 30 pcs Opening
    // Finished Murukku: 50 pkts Opening
    await InventoryLedgerService.recordMovement({
      materialId: oil.id,
      category: 'RAW_MATERIAL',
      transactionType: 'OPENING_STOCK',
      qtyIn: 30,
      unit: 'L',
      sourceDocumentType: 'OPENING',
      sourceDocumentId: 'INIT-OIL',
    });
    await InventoryLedgerService.recordMovement({
      materialId: spice.id,
      category: 'RAW_MATERIAL',
      transactionType: 'OPENING_STOCK',
      qtyIn: 5,
      unit: 'KG',
      sourceDocumentType: 'OPENING',
      sourceDocumentId: 'INIT-SPICE',
    });
    await InventoryLedgerService.recordMovement({
      materialId: pouch.id,
      category: 'PACKAGING',
      transactionType: 'OPENING_STOCK',
      qtyIn: 500,
      unit: 'PIECES',
      sourceDocumentType: 'OPENING',
      sourceDocumentId: 'INIT-POUCH',
    });
    await InventoryLedgerService.recordMovement({
      materialId: carton.id,
      category: 'PACKAGING',
      transactionType: 'OPENING_STOCK',
      qtyIn: 30,
      unit: 'PIECES',
      sourceDocumentType: 'OPENING',
      sourceDocumentId: 'INIT-CARTON',
    });
    await InventoryLedgerService.recordMovement({
      productId: product.id,
      category: 'FINISHED_GOODS',
      transactionType: 'OPENING_STOCK',
      qtyIn: 50,
      unit: 'PACKETS',
      sourceDocumentType: 'OPENING',
      sourceDocumentId: 'INIT-FG',
    });

    // 4. Test Zero-output validation
    const zeroOutputRes = await fetch('http://localhost:5004/api/production', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: product.id,
        bomId: bom.id,
        runNumber: 'PR-TEST-ZERO',
        batchSize: 200,
        plannedOutput: 200,
        goodOutput: 0,
        actualConsumptions: [{ materialId: flour.id, actualQty: 40, unit: 'KG' }],
      }),
    });
    assert(zeroOutputRes.status === 400, 'Zero output production run is rejected with 400');

    // 5. Execute Exact Benchmark Production Run
    // Planned: Flour 40kg, Oil 10L, Spice 1.2kg, Pouches 200, Cartons 10 -> Expected: 200 pkts
    // Actual: Flour 40kg, Oil 10.5L, Spice 1.2kg, Good Packets 188, Damaged Pouches 6, Cartons 9
    // Overheads: Labour ₹1200, Gas/Power ₹600
    const prodRes = await fetch('http://localhost:5004/api/production', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: product.id,
        bomId: bom.id,
        runNumber: 'PR-MURUKKU-BENCHMARK-001',
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
    assert(prodRes.status === 201 && prodData.success, 'Benchmark production run successfully executed');

    // 6. Assert Yield Variance: -6.00% and Warning Trigger
    const yieldVar = prodData.data.yieldVariancePct;
    assert(yieldVar === -6, `Yield variance matches benchmark: -6.00% (actual: ${yieldVar}%)`);
    assert(prodData.data.yieldWarning === true, 'Yield variance triggers warning (> 3% tolerance)');

    // 7. Assert Oil Consumption Variance: +5.00% and Material Warning Trigger
    assert(prodData.data.hasMaterialVarianceWarning === true, 'Oil consumption variance triggers warning (> 3% tolerance)');

    // 8. Assert Closing Stock Balances after Production:
    // Flour: 160 - 40 = 120 KG
    const flourStock = await InventoryLedgerService.getCurrentStock(flour.id);
    assert(flourStock.equals(120), `Closing Flour stock matches benchmark: 120 KG (actual: ${flourStock})`);

    // Oil: 30 - 10.5 = 19.5 L
    const oilStock = await InventoryLedgerService.getCurrentStock(oil.id);
    assert(oilStock.equals(19.5), `Closing Oil stock matches benchmark: 19.5 L (actual: ${oilStock})`);

    // Spice Mix: 5 - 1.2 = 3.8 KG
    const spiceStock = await InventoryLedgerService.getCurrentStock(spice.id);
    assert(spiceStock.equals(3.8), `Closing Spice stock matches benchmark: 3.8 KG (actual: ${spiceStock})`);

    // Pouches: 500 - (188 good + 6 damaged) = 306 pieces
    const pouchStock = await InventoryLedgerService.getCurrentStock(pouch.id);
    assert(pouchStock.equals(306), `Closing Pouch stock matches benchmark: 306 pcs (actual: ${pouchStock})`);

    // Cartons: 30 - 9 = 21 pieces
    const cartonStock = await InventoryLedgerService.getCurrentStock(carton.id);
    assert(cartonStock.equals(21), `Closing Carton stock matches benchmark: 21 pcs (actual: ${cartonStock})`);

    // Finished Murukku Packets: 50 opening + 188 produced = 238 packets
    const fgStock = await InventoryLedgerService.getCurrentStock(product.id, true);
    assert(fgStock.equals(238), `Closing Finished Goods stock matches benchmark: 238 pkts (actual: ${fgStock})`);

    console.log(`\n📊 Phase 4 Test Summary: Passed: ${passed}, Failed: ${failed}`);
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

runPhase4Tests();

