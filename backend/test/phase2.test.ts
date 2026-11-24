process.env.NODE_ENV = 'test';
import app from '../src/index.js';
import { query } from '../src/config/db.js';

async function runPhase2Tests() {
  console.log('🧪 Running Phase 2 Automated Tests (Auth, Roles, Master Data)...');

  const server = app.listen(5002);
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
    // 1. Test invalid login
    const badLoginRes = await fetch('http://localhost:5002/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@trima.com', password: 'wrongpassword' }),
    });
    assert(badLoginRes.status === 401, 'Invalid password is rejected with 401');

    // 2. Test valid login for all 5 roles
    const roles = [
      'salesman@trima.com',
      'admin@trima.com',
      'production@trima.com',
      'auditor@trima.com',
      'owner@trima.com',
    ];

    const tokens: Record<string, string> = {};

    for (const email of roles) {
      const res = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const data = await res.json();
      assert(res.status === 200 && data.success && !!data.token, `Login successful for ${email}`);
      tokens[data.user.role] = data.token;
    }

    // 3. Test Protected endpoint without token (should be 401)
    const unauthRes = await fetch('http://localhost:5002/api/master/products');
    assert(unauthRes.status === 401, 'Unauthenticated request to /api/master/products is blocked with 401');

    // 4. Test Authenticated Product Listing (Read access by Salesman)
    const prodRes = await fetch('http://localhost:5002/api/master/products', {
      headers: { Authorization: `Bearer ${tokens['SALESMAN']}` },
    });
    const prodData = await prodRes.json();
    assert(prodRes.status === 200 && prodData.data.length > 0, 'Salesman can view products list');
    assert(prodData.data[0].code === 'PRD-001', 'Murukku 200g product is present in catalogue');

    // 5. Test Role Authorization (Salesman attempting to create a product - should be blocked with 403)
    const forbiddenCreate = await fetch('http://localhost:5002/api/master/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['SALESMAN']}`,
      },
      body: JSON.stringify({
        code: 'PRD-HACK',
        sku: 'HACK',
        name: 'Unauthorized Product',
        category: 'Snacks',
        packSize: '100g',
        netWeightGrams: 100,
        sellingPrice: 20,
      }),
    });
    assert(forbiddenCreate.status === 403, 'Salesman is forbidden (403) from creating products');

    // 6. Test Admin creating a valid product
    const adminCreate = await fetch('http://localhost:5002/api/master/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokens['ADMIN']}`,
      },
      body: JSON.stringify({
        code: 'PRD-MIXTURE-200G',
        sku: 'MIX-200G',
        name: 'Madras Mixture 200g',
        category: 'Snacks',
        packSize: '200g',
        netWeightGrams: 200,
        sellingPrice: 55,
      }),
    });
    const adminCreateData = await adminCreate.json();
    assert(adminCreate.status === 201 && adminCreateData.success, 'Admin can successfully create products');

    // 7. Verify Audit Log was generated for product creation
    const auditLogs = await query('SELECT * FROM "AuditLog" WHERE action = $1 AND "entityName" = $2', [
      'CREATE',
      'Product',
    ]);
    assert(auditLogs.length > 0, 'Audit log was created for master product creation');

    // 8. Test Customer listing and assigned salesman filtering
    const custRes = await fetch('http://localhost:5002/api/master/customers', {
      headers: { Authorization: `Bearer ${tokens['SALESMAN']}` },
    });
    const custData = await custRes.json();
    assert(custRes.status === 200 && custData.data.length > 0, 'Salesman can view assigned customers');

    // 9. Verify benchmark materials exist
    const matRes = await fetch('http://localhost:5002/api/master/materials', {
      headers: { Authorization: `Bearer ${tokens['PRODUCTION_SUPERVISOR']}` },
    });
    const matData = await matRes.json();
    assert(matRes.status === 200 && matData.data.length >= 5, 'Material master contains all benchmark materials');

    console.log(`\n📊 Phase 2 Test Summary: Passed: ${passed}, Failed: ${failed}`);
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

runPhase2Tests();

