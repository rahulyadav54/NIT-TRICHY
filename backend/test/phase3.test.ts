process.env.NODE_ENV = 'test';
import app from '../src/index.js';
import { UnitConversionService } from '../src/utils/unitConverter.js';
import { InventoryLedgerService } from '../src/modules/inventory/inventoryLedger.service.js';
import { queryOne } from '../src/config/db.js';
import Decimal from 'decimal.js';

async function runPhase3Tests() {
  console.log('🧪 Running Phase 3 Automated Tests (BOM, Purchases & Inventory Ledger)...');

  const server = app.listen(5003);
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
    // 1. Unit Conversion Service Tests
    const kgToG = UnitConversionService.convert(1.5, 'KG', 'G');
    assert(kgToG.equals(1500), 'Unit conversion: 1.5 KG == 1500 G');

    const gToKg = UnitConversionService.convert(250, 'G', 'KG');
    assert(gToKg.equals(0.25), 'Unit conversion: 250 G == 0.25 KG');

    const lToMl = UnitConversionService.convert(2, 'L', 'ML');
    assert(lToMl.equals(2000), 'Unit conversion: 2 L == 2000 ML');

    let threwIncompatible = false;
    try {
      UnitConversionService.convert(10, 'KG', 'L');
    } catch {
      threwIncompatible = true;
    }
    assert(threwIncompatible, 'Unit conversion: Incompatible conversion (KG to L) throws error');

    // 2. Fetch admin auth token for API calls
    const loginRes = await fetch('http://localhost:5003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@trima.com', password: 'password123' }),
    });
    const { token } = await loginRes.json();

    // 3. BOM Retrieval and Scaling Verification
    const bomListRes = await fetch('http://localhost:5003/api/bom', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const bomListData = await bomListRes.json();
    assert(bomListData.data.length > 0, 'Murukku BOM is present');
    const murukkuBom = bomListData.data[0];

    // Scale to batch of 400 packets (2x multiplier)
    const scaleRes = await fetch(`http://localhost:5003/api/bom/${murukkuBom.id}/scale?targetOutput=400`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const scaleData = await scaleRes.json();
    assert(scaleData.data.scaleRatio === 2, 'BOM scaling ratio correctly computes 2.0x for 400 packets');
    const scaledFlour = scaleData.data.items.find((i: any) => i.materialCode === 'MAT-FLOUR');
    assert(scaledFlour.scaledQuantity === 80, 'Scaled Flour requirement is 80 KG (40 KG * 2)');

    // 4. Initial Benchmark Opening Stock Movement (100 kg Flour)
    const flourMat = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-FLOUR']);
    assert(!!flourMat, 'Flour material found in database');

    await InventoryLedgerService.recordMovement({
      materialId: flourMat.id,
      category: 'RAW_MATERIAL',
      transactionType: 'OPENING_STOCK',
      qtyIn: 100,
      qtyOut: 0,
      unit: 'KG',
      sourceDocumentType: 'OPENING',
      sourceDocumentId: 'INIT-OPENING',
      notes: 'Benchmark Opening Stock: 100 kg Flour',
    });

    const flourOpeningStock = await InventoryLedgerService.getCurrentStock(flourMat.id);
    assert(flourOpeningStock.equals(100), `Opening Flour stock recorded at 100 KG (actual: ${flourOpeningStock})`);

    // 5. Benchmark Purchase Receipt: 60 kg Flour @ ₹45/kg
    const supplier = await queryOne('SELECT id FROM "Supplier" WHERE code = $1', ['SUPP-001']);
    const purchaseRes = await fetch('http://localhost:5003/api/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        supplierId: supplier.id,
        poNumber: 'PO-TEST-001',
        status: 'RECEIVED',
        items: [
          {
            materialId: flourMat.id,
            orderedQty: 60,
            receivedQty: 60,
            unitRate: 45,
            unit: 'KG',
          },
        ],
      }),
    });
    const purchaseData = await purchaseRes.json();
    assert(purchaseRes.status === 201 && purchaseData.success, 'Benchmark purchase order created and received');

    // 6. Verify Closing Flour Stock: Exactly 160 KG (100 + 60)
    const postPurchaseFlourStock = await InventoryLedgerService.getCurrentStock(flourMat.id);
    assert(
      postPurchaseFlourStock.equals(160),
      `Post-purchase Flour stock matches benchmark exactly: 160 KG (actual: ${postPurchaseFlourStock})`
    );

    // 7. Verify Negative Stock Prevention Rule
    let threwNegativeStock = false;
    try {
      await InventoryLedgerService.recordMovement({
        materialId: flourMat.id,
        category: 'RAW_MATERIAL',
        transactionType: 'PRODUCTION_ISSUE',
        qtyIn: 0,
        qtyOut: 500, // Exceeds 160 KG stock
        unit: 'KG',
        sourceDocumentType: 'ADJUSTMENT',
        sourceDocumentId: 'TEST-OVERDRAW',
        allowNegative: false,
      });
    } catch {
      threwNegativeStock = true;
    }
    assert(threwNegativeStock, 'Negative stock prevention rule blocked unauthorized stock depletion');

    // 8. Verify Inventory Ledger Audit Records
    const ledgerRes = await fetch(`http://localhost:5003/api/inventory/ledger?materialId=${flourMat.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ledgerData = await ledgerRes.json();
    assert(ledgerData.data.length >= 2, 'Stock ledger tracks both opening receipt and purchase receipt movements');

    console.log(`\n📊 Phase 3 Test Summary: Passed: ${passed}, Failed: ${failed}`);
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

runPhase3Tests();
