import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

/**
 * Idempotently populates synthetic NIT-evaluation demo data on PostgreSQL
 * whenever the transactional tables ("Purchase") are empty.
 */
export async function ensureDemoDataBootstrapped(pool: pg.Pool): Promise<void> {
  // Always ensure any Material with openingStock > 0 and zero InventoryMovement rows gets its OPENING_STOCK entry
  const adminRow = await pool.query<{ id: string }>('SELECT id FROM "User" WHERE role = \'ADMIN\' LIMIT 1');
  const adminId = adminRow.rows[0]?.id || null;
  const missingOpeningMats = await pool.query<{
    id: string;
    category: string;
    openingStock: string;
    unit: string;
  }>(
    `SELECT m.id, m.category, m."openingStock", m.unit
     FROM "Material" m
     WHERE m."openingStock" > 0
       AND NOT EXISTS (SELECT 1 FROM "InventoryMovement" im WHERE im."materialId" = m.id)`
  );
  for (const m of missingOpeningMats.rows) {
    await pool.query(
      'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'5 days\', NOW())',
      [randomUUID(), m.id, m.category, 'OPENING_STOCK', m.openingStock, '0.0000', m.openingStock, m.unit, 'OPENING_SEED', 'INIT-SEED', adminId, 'Reconciled Opening Stock']
    );
  }

  const poCount = await pool.query<{ cnt: number }>('SELECT COUNT(*)::int AS cnt FROM "Supplier"');
  if ((poCount.rows[0]?.cnt ?? 0) > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Ensure 5 Core Role Users
  const users = [
    { email: 'salesman@trima.com', name: 'Ravi Salesman', role: 'SALESMAN', phone: '+91 98765 00001' },
    { email: 'admin@trima.com', name: 'Priya Admin', role: 'ADMIN', phone: '+91 98765 00002' },
    { email: 'production@trima.com', name: 'Murugan Supervisor', role: 'PRODUCTION_SUPERVISOR', phone: '+91 98765 00003' },
    { email: 'auditor@trima.com', name: 'Anand Auditor', role: 'ACCOUNTANT_AUDITOR', phone: '+91 98765 00004' },
    { email: 'owner@trima.com', name: 'Sundaram Owner', role: 'OWNER', phone: '+91 98765 00005' },
  ];
  const userIds: Record<string, string> = {};
  for (const u of users) {
    await pool.query(
      'INSERT INTO "User" (id, email, "passwordHash", name, role, phone, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING',
      [randomUUID(), u.email, passwordHash, u.name, u.role, u.phone]
    );
    const row = await pool.query<{ id: string }>('SELECT id FROM "User" WHERE email = $1', [u.email]);
    if (row.rows[0]) userIds[u.role] = row.rows[0].id;
  }

  // 2. Suppliers
  const suppliers = [
    { code: 'SUPP-001', name: 'Cauvery Agro Mills', gstin: '33AABCS3333C1Z3', contactInfo: 'Senthil Kumar (+91 94432 33333)', address: '24 Mill Road, Manachanallur, Tiruchirappalli, Tamil Nadu', state: 'Tamil Nadu', stateCode: '33', terms: '15 Days Credit' },
    { code: 'SUPP-002', name: 'Trichy Packaging Co.', gstin: '33AABCT4444D1Z4', contactInfo: 'Karthik Rajan (+91 94431 22222)', address: 'B-8 Thuvakudi Industrial Estate, Tiruchirappalli', state: 'Tamil Nadu', stateCode: '33', terms: 'Net 30 Days' },
    { code: 'SUPP-003', name: 'Delta Edible Oils', gstin: '33AABCD5555E1Z5', contactInfo: 'Meenakshi Traders (+91 98424 55555)', address: '18 Thanjavur Main Road, Tiruchirappalli', state: 'Tamil Nadu', stateCode: '33', terms: '7 Days Credit' },
  ];
  const supplierIds: Record<string, string> = {};
  for (const s of suppliers) {
    await pool.query(
      'INSERT INTO "Supplier" (id, code, name, gstin, "contactInfo", address, state, "stateCode", "paymentTerms", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW()) ON CONFLICT (code) DO NOTHING',
      [randomUUID(), s.code, s.name, s.gstin, s.contactInfo, s.address, s.state, s.stateCode, s.terms]
    );
    const row = await pool.query<{ id: string }>('SELECT id FROM "Supplier" WHERE code = $1', [s.code]);
    if (row.rows[0]) supplierIds[s.code] = row.rows[0].id;
  }

  // 3. Customers
  const customers = [
    { code: 'CUST-001', name: 'Retailer A (Madurai Stores)', type: 'RETAILER', gstin: '33AABCR1111A1Z1', addr: '12 South Car Street, Madurai, Tamil Nadu', state: 'Tamil Nadu', stateCode: '33', phone: '+91 94444 11111', email: 'retailer.a@example.com', limit: '50000.00' },
    { code: 'CUST-002', name: 'Distributor B (Bangalore Wholesale)', type: 'DISTRIBUTOR', gstin: '29AABCD2222B1Z2', addr: '45 APMC Yard, Yeshwanthpur, Bengaluru, Karnataka', state: 'Karnataka', stateCode: '29', phone: '+91 98888 22222', email: 'distributor.b@example.com', limit: '200000.00' },
    { code: 'CUST-003', name: 'Kaveri Supermart (Trichy)', type: 'RETAILER', gstin: '33AABCK3333F1Z8', addr: '88 Salai Road, Thillai Nagar, Tiruchirappalli', state: 'Tamil Nadu', stateCode: '33', phone: '+91 94430 77777', email: 'kaveri.mart@example.com', limit: '75000.00' },
    { code: 'CUST-004', name: 'Srirangam Mart (Retail)', type: 'RETAILER', gstin: '33AABCS7777G1Z9', addr: '14 Ammamandapam Road, Srirangam, Tiruchirappalli', state: 'Tamil Nadu', stateCode: '33', phone: '+91 94435 88888', email: 'srirangam.mart@example.com', limit: '40000.00' },
  ];
  const customerIds: Record<string, string> = {};
  for (const c of customers) {
    await pool.query(
      'INSERT INTO "Customer" (id, code, name, type, gstin, "billingAddress", "shippingAddress", state, "stateCode", phone, email, "creditLimit", "assignedSalesmanId", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW()) ON CONFLICT (code) DO NOTHING',
      [randomUUID(), c.code, c.name, c.type, c.gstin, c.addr, c.addr, c.state, c.stateCode, c.phone, c.email, c.limit, userIds['SALESMAN']]
    );
    const row = await pool.query<{ id: string }>('SELECT id FROM "Customer" WHERE code = $1', [c.code]);
    if (row.rows[0]) customerIds[c.code] = row.rows[0].id;
  }

  // 4. Products
  const products = [
    { code: 'PRD-001', sku: 'MRK-200G', name: 'Murukku 200g Packet', cat: 'Snacks', pack: '200g', wt: '200.00', price: '50.00', hsn: '21069099', gst: '5.00', unit: 'PACKETS' },
    { code: 'PRD-002', sku: 'MIX-250G', name: 'Madras Mixture 250g Packet', cat: 'Snacks', pack: '250g', wt: '250.00', price: '65.00', hsn: '21069099', gst: '5.00', unit: 'PACKETS' },
  ];
  const productIds: Record<string, string> = {};
  for (const p of products) {
    const existing = await pool.query<{ id: string }>('SELECT id FROM "Product" WHERE code = $1', [p.code]);
    if (!existing.rows[0]) {
      const pid = randomUUID();
      await pool.query(
        'INSERT INTO "Product" (id, code, sku, name, category, "packSize", "netWeightGrams", "sellingPrice", "hsnCode", "gstRate", unit, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW())',
        [pid, p.code, p.sku, p.name, p.cat, p.pack, p.wt, p.price, p.hsn, p.gst, p.unit]
      );
      await pool.query(
        'INSERT INTO "ProductPrice" (id, "productId", price, "isCurrent", "effectiveDate", "createdAt") VALUES ($1, $2, $3, true, NOW(), NOW())',
        [randomUUID(), pid, p.price]
      );
      productIds[p.code] = pid;
    } else {
      productIds[p.code] = existing.rows[0].id;
    }
  }

  // 5. Materials + Opening Movements (only if Material doesn't have opening movements yet)
  const materials = [
    { code: 'MAT-FLOUR', name: 'Flour (Rice & Urad Mix)', cat: 'RAW_MATERIAL', unit: 'KG', opening: '100.0000', reorder: '25.0000', rate: '42.00' },
    { code: 'MAT-OIL', name: 'Cooking Oil', cat: 'RAW_MATERIAL', unit: 'L', opening: '30.0000', reorder: '10.0000', rate: '140.00' },
    { code: 'MAT-SPICE', name: 'Salt & Spice Mix', cat: 'RAW_MATERIAL', unit: 'KG', opening: '5.0000', reorder: '2.0000', rate: '200.00' },
    { code: 'PKG-POUCH-200G', name: '200g Printed Pouch', cat: 'PACKAGING', unit: 'PIECES', opening: '500.0000', reorder: '100.0000', rate: '2.50' },
    { code: 'PKG-CARTON-20', name: 'Master Corrugated Carton (20 pkts)', cat: 'PACKAGING', unit: 'PIECES', opening: '30.0000', reorder: '10.0000', rate: '15.00' },
    { code: 'PKG-POUCH-250G', name: '250g Laminated Pouch', cat: 'PACKAGING', unit: 'PIECES', opening: '350.0000', reorder: '80.0000', rate: '3.10' },
  ];
  const matIds: Record<string, string> = {};
  for (const m of materials) {
    await pool.query(
      'INSERT INTO "Material" (id, code, name, category, unit, "openingStock", "reorderLevel", "purchaseRate", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()) ON CONFLICT (code) DO NOTHING',
      [randomUUID(), m.code, m.name, m.cat, m.unit, m.opening, m.reorder, m.rate]
    );
    const row = await pool.query<{ id: string }>('SELECT id FROM "Material" WHERE code = $1', [m.code]);
    if (row.rows[0]) matIds[m.code] = row.rows[0].id;
  }

  const movCount = await pool.query<{ cnt: number }>('SELECT COUNT(*)::int AS cnt FROM "InventoryMovement"');
  if ((movCount.rows[0]?.cnt ?? 0) === 0) {
    for (const m of materials) {
      await pool.query(
        'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'5 days\', NOW())',
        [randomUUID(), matIds[m.code], m.cat, 'OPENING_STOCK', m.opening, '0.0000', m.opening, m.unit, 'OPENING_SEED', 'INIT-SEED', userIds['ADMIN'], 'Initial Opening Stock']
      );
    }
    await pool.query(
      'INSERT INTO "InventoryMovement" (id, "productId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'5 days\', NOW())',
      [randomUUID(), productIds['PRD-001'], 'FINISHED_GOODS', 'OPENING_STOCK', '50.0000', '0.0000', '50.0000', 'PACKETS', 'OPENING_SEED', 'INIT-SEED', userIds['ADMIN'], 'Opening Finished Goods']
    );
  }

  // 6. BOM
  let bomId: string;
  const existingBom = await pool.query<{ id: string }>('SELECT id FROM "BOM" WHERE "bomNumber" = $1', ['BOM-MRK-200G-V1']);
  if (!existingBom.rows[0]) {
    bomId = randomUUID();
    await pool.query(
      'INSERT INTO "BOM" (id, "bomNumber", "productId", version, "batchSize", "expectedOutput", notes, "isActive", "effectiveDate", "createdAt", "updatedAt") VALUES ($1, $2, $3, 1, 200, 200, $4, true, NOW(), NOW(), NOW())',
      [bomId, 'BOM-MRK-200G-V1', productIds['PRD-001'], 'Standard Murukku 200g Recipe']
    );
    const bomItems = [
      { mat: 'MAT-FLOUR', qty: '40.0000', unit: 'KG' },
      { mat: 'MAT-OIL', qty: '10.0000', unit: 'L' },
      { mat: 'MAT-SPICE', qty: '1.2000', unit: 'KG' },
      { mat: 'PKG-POUCH-200G', qty: '200.0000', unit: 'PIECES' },
      { mat: 'PKG-CARTON-20', qty: '10.0000', unit: 'PIECES' },
    ];
    for (const bi of bomItems) {
      await pool.query(
        'INSERT INTO "BOMItem" (id, "bomId", "materialId", "standardQuantity", unit, "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())',
        [randomUUID(), bomId, matIds[bi.mat], bi.qty, bi.unit]
      );
    }
  } else {
    bomId = existingBom.rows[0].id;
  }

  console.log('✅ Auto-seeded TRIMA ERP master data & opening stock.');
}

