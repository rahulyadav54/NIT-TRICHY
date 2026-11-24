import { query, queryOne, execute } from '../src/config/db.js';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import Decimal from 'decimal.js';

export async function seedMasterData() {
  console.log('🌱 Seeding initial roles, users, and master data into PostgreSQL...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Five Core Role Users
  const users = [
    { email: 'salesman@trima.com', name: 'Ravi Salesman', role: 'SALESMAN', phone: '+91 98765 00001' },
    { email: 'admin@trima.com', name: 'Priya Admin', role: 'ADMIN', phone: '+91 98765 00002' },
    { email: 'production@trima.com', name: 'Murugan Supervisor', role: 'PRODUCTION_SUPERVISOR', phone: '+91 98765 00003' },
    { email: 'auditor@trima.com', name: 'Anand Auditor', role: 'ACCOUNTANT_AUDITOR', phone: '+91 98765 00004' },
    { email: 'owner@trima.com', name: 'Sundaram Owner', role: 'OWNER', phone: '+91 98765 00005' },
  ];

  const userMap: Record<string, string> = {};
  for (const u of users) {
    let existing = await queryOne('SELECT id FROM "User" WHERE email = $1', [u.email]);
    if (!existing) {
      const id = randomUUID();
      await execute(
        'INSERT INTO "User" (id, email, "passwordHash", name, role, phone, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())',
        [id, u.email, passwordHash, u.name, u.role, u.phone]
      );
      userMap[u.role] = id;
    } else {
      userMap[u.role] = existing.id;
    }
  }

  // 2. Customers
  const customers = [
    {
      code: 'CUST-001',
      name: 'Retailer A (Madurai Stores)',
      type: 'RETAILER',
      gstin: '33AABCR1111A1Z1',
      billingAddress: '12 South Car Street, Madurai, Tamil Nadu',
      shippingAddress: '12 South Car Street, Madurai, Tamil Nadu',
      state: 'Tamil Nadu',
      stateCode: '33',
      phone: '+91 94444 11111',
      email: 'retailer.a@example.com',
      creditLimit: 50000,
      assignedSalesmanId: userMap['SALESMAN'],
    },
    {
      code: 'CUST-002',
      name: 'Distributor B (Bangalore Wholesale)',
      type: 'DISTRIBUTOR',
      gstin: '29AABCD2222B1Z2',
      billingAddress: '45 APMC Yard, Yeshwanthpur, Bengaluru, Karnataka',
      shippingAddress: '45 APMC Yard, Yeshwanthpur, Bengaluru, Karnataka',
      state: 'Karnataka',
      stateCode: '29',
      phone: '+91 98888 22222',
      email: 'distributor.b@example.com',
      creditLimit: 200000,
      assignedSalesmanId: userMap['SALESMAN'],
    },
  ];

  for (const c of customers) {
    const existing = await queryOne('SELECT id FROM "Customer" WHERE code = $1', [c.code]);
    if (!existing) {
      await execute(
        'INSERT INTO "Customer" (id, code, name, type, gstin, "billingAddress", "shippingAddress", state, "stateCode", phone, email, "creditLimit", "assignedSalesmanId", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())',
        [
          randomUUID(),
          c.code,
          c.name,
          c.type,
          c.gstin,
          c.billingAddress,
          c.shippingAddress,
          c.state,
          c.stateCode,
          c.phone,
          c.email,
          new Decimal(c.creditLimit).toFixed(2),
          c.assignedSalesmanId,
        ]
      );
    }
  }

  // 3. Suppliers
  const suppliers = [
    {
      code: 'SUPP-001',
      name: 'Cauvery Agro Mills',
      gstin: '33AABCS3333C1Z3',
      contactInfo: 'Senthil Kumar (+91 94432 33333)',
      address: '24 Mill Road, Manachanallur, Tiruchirappalli, Tamil Nadu',
      state: 'Tamil Nadu',
      stateCode: '33',
      paymentTerms: '15 Days Credit',
    },
  ];

  for (const s of suppliers) {
    const existing = await queryOne('SELECT id FROM "Supplier" WHERE code = $1', [s.code]);
    if (!existing) {
      await execute(
        'INSERT INTO "Supplier" (id, code, name, gstin, "contactInfo", address, state, "stateCode", "paymentTerms", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())',
        [randomUUID(), s.code, s.name, s.gstin, s.contactInfo, s.address, s.state, s.stateCode, s.paymentTerms]
      );
    }
  }

  // 4. Products (Murukku 200g)
  const products = [
    {
      code: 'PRD-001',
      sku: 'MRK-200G',
      name: 'Murukku 200g Packet',
      category: 'Snacks',
      packSize: '200g',
      netWeightGrams: 200,
      sellingPrice: 50,
      hsnCode: '21069099',
      gstRate: 5.0,
      unit: 'PACKETS',
    },
  ];

  for (const p of products) {
    const existing = await queryOne('SELECT id FROM "Product" WHERE code = $1', [p.code]);
    if (!existing) {
      const prodId = randomUUID();
      await execute(
        'INSERT INTO "Product" (id, code, sku, name, category, "packSize", "netWeightGrams", "sellingPrice", "hsnCode", "gstRate", unit, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())',
        [
          prodId,
          p.code,
          p.sku,
          p.name,
          p.category,
          p.packSize,
          new Decimal(p.netWeightGrams).toFixed(2),
          new Decimal(p.sellingPrice).toFixed(2),
          p.hsnCode,
          new Decimal(p.gstRate).toFixed(2),
          p.unit,
        ]
      );

      await execute(
        'INSERT INTO "ProductPrice" (id, "productId", price, "isCurrent", "effectiveDate", "createdAt") VALUES ($1, $2, $3, true, NOW(), NOW())',
        [randomUUID(), prodId, new Decimal(p.sellingPrice).toFixed(2)]
      );
    }
  }

  // 5. Materials
  const materials = [
    {
      code: 'MAT-FLOUR',
      name: 'Flour (Rice & Urad Mix)',
      category: 'RAW_MATERIAL',
      unit: 'KG',
      openingStock: 100,
      reorderLevel: 25,
      purchaseRate: 42,
    },
    {
      code: 'MAT-OIL',
      name: 'Cooking Oil',
      category: 'RAW_MATERIAL',
      unit: 'L',
      openingStock: 30,
      reorderLevel: 10,
      purchaseRate: 140,
    },
    {
      code: 'MAT-SPICE',
      name: 'Salt & Spice Mix',
      category: 'RAW_MATERIAL',
      unit: 'KG',
      openingStock: 5,
      reorderLevel: 2,
      purchaseRate: 200,
    },
    {
      code: 'PKG-POUCH-200G',
      name: '200g Printed Pouch',
      category: 'PACKAGING',
      unit: 'PIECES',
      openingStock: 500,
      reorderLevel: 100,
      purchaseRate: 2.50,
    },
    {
      code: 'PKG-CARTON-20',
      name: 'Master Corrugated Carton (20 pkts)',
      category: 'PACKAGING',
      unit: 'PIECES',
      openingStock: 30,
      reorderLevel: 10,
      purchaseRate: 15.00,
    },
  ];

  for (const m of materials) {
    const existing = await queryOne('SELECT id FROM "Material" WHERE code = $1', [m.code]);
    if (!existing) {
      await execute(
        'INSERT INTO "Material" (id, code, name, category, unit, "openingStock", "reorderLevel", "purchaseRate", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())',
        [
          randomUUID(),
          m.code,
          m.name,
          m.category,
          m.unit,
          new Decimal(m.openingStock).toFixed(4),
          new Decimal(m.reorderLevel).toFixed(4),
          new Decimal(m.purchaseRate).toFixed(2),
        ]
      );
    }
  }

  // 6. Benchmark BOM for Murukku 200g (Batch size 200 pkts)
  const product = await queryOne('SELECT id FROM "Product" WHERE code = $1', ['PRD-001']);
  const flour = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-FLOUR']);
  const oil = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-OIL']);
  const spice = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['MAT-SPICE']);
  const pouch = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['PKG-POUCH-200G']);
  const carton = await queryOne('SELECT id FROM "Material" WHERE code = $1', ['PKG-CARTON-20']);

  if (product && flour && oil && spice && pouch && carton) {
    let existingBom = await queryOne('SELECT id FROM "BOM" WHERE "bomNumber" = $1', ['BOM-MRK-200G-V1']);
    if (!existingBom) {
      const bomId = randomUUID();
      await execute(
        `INSERT INTO "BOM" (id, "bomNumber", "productId", version, "batchSize", "expectedOutput", notes, "isActive", "effectiveDate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 1, 200, 200, 'Standard Benchmark Murukku 200g Recipe', true, NOW(), NOW(), NOW())`,
        [bomId, 'BOM-MRK-200G-V1', product.id]
      );

      const items = [
        { materialId: flour.id, qty: 40, unit: 'KG' },
        { materialId: oil.id, qty: 10, unit: 'L' },
        { materialId: spice.id, qty: 1.2, unit: 'KG' },
        { materialId: pouch.id, qty: 200, unit: 'PIECES' },
        { materialId: carton.id, qty: 10, unit: 'PIECES' },
      ];

      for (const it of items) {
        await execute(
          `INSERT INTO "BOMItem" (id, "bomId", "materialId", "standardQuantity", unit, "createdAt")
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [randomUUID(), bomId, it.materialId, it.qty, it.unit]
        );
      }
    }
  }

  console.log('✅ PostgreSQL Master Data and 5 Roles successfully seeded.');
}

if (process.argv[1]?.includes('seed')) {
  seedMasterData()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
