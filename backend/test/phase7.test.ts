process.env.NODE_ENV = 'test';
import app from '../src/index.js';
import { CostingService } from '../src/modules/costing/costing.routes.js';
import { queryOne } from '../src/config/db.js';
import Decimal from 'decimal.js';

async function runPhase7Tests() {
  console.log('🧪 Running Phase 7 Automated Tests (Product Costing & Inventory Valuation)...');

  const server = app.listen(5007);
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
    // 1. Authenticate Owner
    const ownerLogin = await fetch('http://localhost:5007/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@trima.com', password: 'password123' }),
    });
    const { token } = await ownerLogin.json();

    // 2. Verify Weighted-Average Costing (WAC) for Flour
    // Opening Flour: 100 kg @ ₹42/kg = ₹4,200
    // Purchase Flour: 60 kg @ ₹45/kg = ₹2,700
    // Total Value: ₹6,900 / 160 kg = ₹43.125 / kg
    const flour = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-FLOUR']);
    assert(!!flour, 'Flour material found');

    const flourWac = await CostingService.getWeightedAverageRate(flour.id);
    const expectedWac = new Decimal(6900).dividedBy(160); // 43.125
    assert(
      flourWac.equals(expectedWac),
      `Weighted-average flour rate matches formula: ₹43.125/kg (actual: ₹${flourWac}/kg)`
    );

    // 3. Verify Batch Costing on Benchmark Production Run (188 good packets produced)
    // Run ID: PR-MURUKKU-BENCHMARK-001 from Phase 4
    const run = await queryOne('SELECT id FROM "ProductionRun" WHERE "runNumber" = $1', ['PR-MURUKKU-BENCHMARK-001']);
    assert(!!run, 'Benchmark production run found in database');

    const costingRes = await fetch(`http://localhost:5007/api/costing/run/${run.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const costingData = await costingRes.json();
    assert(costingRes.status === 200 && costingData.success, 'Fetched production batch costing breakdown');

    const { costBreakdown, unitCost } = costingData.data;

    // Verify overhead inclusion: Labour ₹1,200, Gas/Power ₹600
    assert(costBreakdown.labourCost === 1200, 'Labour cost of ₹1,200 included in production cost');
    assert(costBreakdown.powerGasCost === 600, 'Power & Gas cost of ₹600 included in production cost');

    // Packaging cost includes:
    // (188 good pouches + 6 damaged pouches) @ ₹2.50 = 194 * ₹2.50 = ₹485
    // 9 cartons @ ₹15 = ₹135
    // Total packaging cost = ₹620
    assert(costBreakdown.packagingCost === 620, `Packaging cost including damaged pouches is ₹620 (actual: ₹${costBreakdown.packagingCost})`);

    // Verify Cost per Good Packet: Total Batch Cost / 188 good packets
    const expectedCostPerPacket = new Decimal(costBreakdown.totalBatchCost).dividedBy(188);
    assert(
      new Decimal(unitCost.costPerPacket).minus(expectedCostPerPacket).abs().lessThan(0.01),
      `Cost per good packet calculated accurately: ₹${unitCost.costPerPacket} (total: ₹${costBreakdown.totalBatchCost} / 188 pkts)`
    );

    // Verify Positive Gross Margin against ₹50 selling price
    assert(unitCost.grossMarginPerPacket > 0, `Positive gross margin per packet: ₹${unitCost.grossMarginPerPacket}`);
    assert(unitCost.grossMarginPct > 0, `Gross margin percentage: ${unitCost.grossMarginPct.toFixed(2)}%`);

    // 4. Verify Overall Costing Dashboard Analytics
    const dashRes = await fetch('http://localhost:5007/api/costing/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dashData = await dashRes.json();
    assert(dashRes.status === 200 && dashData.success, 'Costing dashboard analytics fetched successfully');
    assert(dashData.data.inventoryValuation.totalValuation > 0, 'Live inventory valuation across Raw, Packaging, and FG computed');

    console.log(`\n📊 Phase 7 Test Summary: Passed: ${passed}, Failed: ${failed}`);
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

runPhase7Tests();

