process.env.NODE_ENV = 'test';
import app from '../src/index.js';
import { queryOne } from '../src/config/db.js';

async function runPhase5Tests() {
  console.log('🧪 Running Phase 5 Automated Tests (Sales Order Management & Salesman Interface)...');

  const server = app.listen(5005);
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
    // 1. Authenticate Salesman and Admin
    const salesLogin = await fetch('http://localhost:5005/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'salesman@trima.com', password: 'password123' }),
    });
    const { token: salesToken, user: salesUser } = await salesLogin.json();

    const adminLogin = await fetch('http://localhost:5005/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@trima.com', password: 'password123' }),
    });
    const { token: adminToken } = await adminLogin.json();

    // 2. Fetch customers and Murukku product
    const retailerA = await queryOne('SELECT id FROM "Customer" WHERE code = $1', ['CUST-001']);
    const distributorB = await queryOne('SELECT id FROM "Customer" WHERE code = $1', ['CUST-002']);
    const product = await queryOne('SELECT id, "sellingPrice" FROM "Product" WHERE code = $1', ['PRD-001']);

    assert(!!retailerA && !!product, 'Retailer A and Product Murukku 200g found in database');

    // 3. Salesman creates order for Retailer A (150 packets @ ₹50 benchmark)
    const orderNum = `SO-BENCHMARK-RETAILER-A-${Date.now()}`;
    const createOrderRes = await fetch('http://localhost:5005/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        customerId: retailerA.id,
        orderNumber: orderNum,
        items: [
          {
            productId: product.id,
            quantity: 150,
          },
        ],
      }),
    });

    const createOrderData = await createOrderRes.json();
    assert(createOrderRes.status === 201 && createOrderData.success, 'Salesman successfully placed Retailer A order in < 1 minute flow');
    assert(createOrderData.data.subtotal === 7500, `Order subtotal is ₹7,500 (150 * ₹50) (actual: ₹${createOrderData.data.subtotal})`);
    assert(createOrderData.data.grandTotal === 7875, `Order grand total is ₹7,875 (₹7500 + 5% GST) (actual: ₹${createOrderData.data.grandTotal})`);

    const orderId = createOrderData.data.orderId;

    // 4. Verify historical price snapshot in SalesOrderItem
    const orderDetailsRes = await fetch(`http://localhost:5005/api/sales/${orderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const orderDetails = await orderDetailsRes.json();
    const item = orderDetails.data.items[0];
    assert(parseFloat(item.unitPrice) === 50, 'Unit price is snapshotted to ₹50 on the order item');
    assert(item.availableStock >= 150, `Finished goods stock check shows available: ${item.availableStock} pkts`);

    // 5. Admin Approves Order
    const approveRes = await fetch(`http://localhost:5005/api/sales/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'APPROVED',
        notes: 'Verified and approved for dispatch',
      }),
    });
    const approveData = await approveRes.json();
    assert(approveRes.status === 200 && approveData.status === 'APPROVED', 'Admin verified and approved Retailer A order');

    // 6. Test Insufficient Stock Protection: Order exceeding available stock
    // e.g. Attempting to approve an order of 10,000 packets when current stock is ~238 pkts
    const hugeOrderRes = await fetch('http://localhost:5005/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${salesToken}`,
      },
      body: JSON.stringify({
        customerId: retailerA.id,
        orderNumber: `SO-OVERDRAW-TEST-${Date.now()}`,
        items: [{ productId: product.id, quantity: 10000 }],
      }),
    });
    const hugeOrderData = await hugeOrderRes.json();
    const hugeOrderId = hugeOrderData.data.orderId;

    const hugeApproveRes = await fetch(`http://localhost:5005/api/sales/${hugeOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'APPROVED' }),
    });

    const hugeApproveData = await hugeApproveRes.json();
    assert(
      hugeApproveRes.status === 400 && hugeApproveData.code === 'INSUFFICIENT_STOCK',
      'Admin cannot approve an order when finished goods stock is insufficient'
    );

    console.log(`\n📊 Phase 5 Test Summary: Passed: ${passed}, Failed: ${failed}`);
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

runPhase5Tests();
