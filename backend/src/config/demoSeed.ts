import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

/**
 * Idempotently populates synthetic NIT-evaluation demo data on PostgreSQL
 * whenever the transactional tables ("Purchase") are empty.
 */
export async function ensureDemoDataBootstrapped(pool: pg.Pool): Promise<void> {
  const poCount = await pool.query<{ cnt: number }>('SELECT COUNT(*)::int AS cnt FROM "Purchase"');
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
        [randomUUID(), matIds[m.code], m.cat, 'OPENING', m.opening, '0.0000', m.opening, m.unit, 'OPENING_SEED', 'INIT-SEED', userIds['ADMIN'], 'Initial Opening Stock']
      );
    }
    await pool.query(
      'INSERT INTO "InventoryMovement" (id, "productId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'5 days\', NOW())',
      [randomUUID(), productIds['PRD-001'], 'FINISHED_GOODS', 'OPENING', '50.0000', '0.0000', '50.0000', 'PACKETS', 'OPENING_SEED', 'INIT-SEED', userIds['ADMIN'], 'Opening Finished Goods']
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

  // 7. Purchase Orders (GRNs)
  const po1Id = randomUUID();
  await pool.query(
    'INSERT INTO "Purchase" (id, "poNumber", "supplierId", "orderDate", "receivedDate", status, subtotal, "taxTotal", "grandTotal", notes, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW() - INTERVAL \'3 days\', NOW() - INTERVAL \'3 days\', $4, $5, $6, $7, $8, NOW(), NOW())',
    [po1Id, 'PO-2026-001', supplierIds['SUPP-001'], 'RECEIVED', '2700.00', '135.00', '2835.00', '60 KG Rice & Urad Flour Mix GRN']
  );
  await pool.query(
    'INSERT INTO "PurchaseItem" (id, "purchaseId", "materialId", "orderedQty", "receivedQty", "unitRate", subtotal, unit, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
    [randomUUID(), po1Id, matIds['MAT-FLOUR'], '60.0000', '60.0000', '45.00', '2700.00', 'KG']
  );
  await pool.query(
    'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'3 days\', NOW())',
    [randomUUID(), matIds['MAT-FLOUR'], 'RAW_MATERIAL', 'PURCHASE_RECEIPT', '60.0000', '0.0000', '160.0000', 'KG', 'PURCHASE', po1Id, userIds['ADMIN'], 'GRN PO-2026-001']
  );

  const po2Id = randomUUID();
  await pool.query(
    'INSERT INTO "Purchase" (id, "poNumber", "supplierId", "orderDate", "receivedDate", status, subtotal, "taxTotal", "grandTotal", notes, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW() - INTERVAL \'2 days\', NOW() - INTERVAL \'2 days\', $4, $5, $6, $7, $8, NOW(), NOW())',
    [po2Id, 'PO-2026-002', supplierIds['SUPP-002'], 'RECEIVED', '1250.00', '62.50', '1312.50', '500 Printed Pouches GRN']
  );
  await pool.query(
    'INSERT INTO "PurchaseItem" (id, "purchaseId", "materialId", "orderedQty", "receivedQty", "unitRate", subtotal, unit, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())',
    [randomUUID(), po2Id, matIds['PKG-POUCH-200G'], '500.0000', '500.0000', '2.50', '1250.00', 'PIECES']
  );
  await pool.query(
    'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'2 days\', NOW())',
    [randomUUID(), matIds['PKG-POUCH-200G'], 'PACKAGING', 'PURCHASE_RECEIPT', '500.0000', '0.0000', '1000.0000', 'PIECES', 'PURCHASE', po2Id, userIds['ADMIN'], 'GRN PO-2026-002']
  );

  // 8. Production Runs (2 batches, including variance-flagged batch)
  const run1Id = randomUUID();
  await pool.query(
    `INSERT INTO "ProductionRun" (id, "runNumber", "productId", "bomId", "batchSize", "plannedOutput", "goodOutput", "damagedPackagingQty", "cartonsUsed", "productionDate", "supervisorUserId", "labourCost", "powerGasCost", "otherOverheads", "materialCost", "packagingCost", "totalCost", "costPerPacket", "yieldVariancePct", status, notes, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 200, 200, 188, 6, 9, NOW() - INTERVAL '1 day', $5, 1200.00, 750.00, 0.00, 3235.00, 625.00, 5810.00, 30.90, -6.00, 'COMPLETED', $6, NOW(), NOW())`,
    [run1Id, 'BATCH-MRK-001', productIds['PRD-001'], bomId, userIds['PRODUCTION_SUPERVISOR'], 'Shift A Murukku Run (6 damaged pouches, +5% oil variance)']
  );
  const runConsumptions = [
    { mat: 'MAT-FLOUR', plan: '40.0000', act: '40.0000', varQ: '0.0000', varP: '0.00', rate: '43.13', tot: '1725.00', unit: 'KG' },
    { mat: 'MAT-OIL', plan: '10.0000', act: '10.5000', varQ: '0.5000', varP: '5.00', rate: '140.00', tot: '1470.00', unit: 'L' },
    { mat: 'MAT-SPICE', plan: '1.2000', act: '1.2000', varQ: '0.0000', varP: '0.00', rate: '200.00', tot: '240.00', unit: 'KG' },
    { mat: 'PKG-POUCH-200G', plan: '188.0000', act: '194.0000', varQ: '6.0000', varP: '3.19', rate: '2.50', tot: '485.00', unit: 'PIECES' },
    { mat: 'PKG-CARTON-20', plan: '9.0000', act: '9.0000', varQ: '0.0000', varP: '0.00', rate: '15.00', tot: '135.00', unit: 'PIECES' },
  ];
  for (const rc of runConsumptions) {
    await pool.query(
      'INSERT INTO "ProductionConsumption" (id, "productionRunId", "materialId", "plannedQty", "actualQty", "varianceQty", "variancePct", "unitCost", "totalCost", unit, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())',
      [randomUUID(), run1Id, matIds[rc.mat], rc.plan, rc.act, rc.varQ, rc.varP, rc.rate, rc.tot, rc.unit]
    );
  }
  // Stock ledger movements for Production Run 1
  await pool.query(
    'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'1 day\', NOW())',
    [randomUUID(), matIds['MAT-FLOUR'], 'RAW_MATERIAL', 'PRODUCTION_ISSUE', '0.0000', '40.0000', '120.0000', 'KG', 'PRODUCTION_RUN', run1Id, userIds['PRODUCTION_SUPERVISOR'], 'Issued to BATCH-MRK-001']
  );
  await pool.query(
    'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'1 day\', NOW())',
    [randomUUID(), matIds['MAT-OIL'], 'RAW_MATERIAL', 'PRODUCTION_ISSUE', '0.0000', '10.5000', '19.5000', 'L', 'PRODUCTION_RUN', run1Id, userIds['PRODUCTION_SUPERVISOR'], 'Issued to BATCH-MRK-001']
  );
  await pool.query(
    'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'1 day\', NOW())',
    [randomUUID(), matIds['PKG-POUCH-200G'], 'PACKAGING', 'PRODUCTION_ISSUE', '0.0000', '194.0000', '806.0000', 'PIECES', 'PRODUCTION_RUN', run1Id, userIds['PRODUCTION_SUPERVISOR'], '188 good + 6 damaged pouches']
  );
  await pool.query(
    'INSERT INTO "InventoryMovement" (id, "productId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'1 day\', NOW())',
    [randomUUID(), productIds['PRD-001'], 'FINISHED_GOODS', 'PRODUCTION_OUTPUT', '188.0000', '0.0000', '238.0000', 'PACKETS', 'PRODUCTION_RUN', run1Id, userIds['PRODUCTION_SUPERVISOR'], 'Output from BATCH-MRK-001']
  );

  // 9. Sales Orders, GST Invoices, Dispatch, Payment
  // Order 1: Dispatched + Partially Paid
  const so1Id = randomUUID();
  await pool.query(
    'INSERT INTO "SalesOrder" (id, "orderNumber", "salesmanUserId", "customerId", "orderDate", status, subtotal, "taxTotal", "grandTotal", notes, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'1 day\', $5, $6, $7, $8, $9, NOW(), NOW())',
    [so1Id, 'SO-2026-001', userIds['SALESMAN'], customerIds['CUST-001'], 'DISPATCHED', '7500.00', '375.00', '7875.00', 'Madurai Retail Bulk Order']
  );
  await pool.query(
    'INSERT INTO "SalesOrderItem" (id, "salesOrderId", "productId", quantity, "unitPrice", subtotal, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), so1Id, productIds['PRD-001'], '150.0000', '50.00', '7500.00']
  );

  const inv1Id = randomUUID();
  await pool.query(
    'INSERT INTO "Invoice" (id, "invoiceNumber", "salesOrderId", "customerId", "invoiceDate", "placeOfSupply", "taxableAmount", "gstRate", "cgstAmount", "sgstAmount", "igstAmount", "grandTotal", "balanceDue", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'1 day\', $5, $6, 5.00, $7, $8, 0.00, $9, $10, $11, NOW(), NOW())',
    [inv1Id, 'UF/2026-27/0001', so1Id, customerIds['CUST-001'], 'Tamil Nadu (33)', '7500.00', '187.50', '187.50', '7875.00', '3875.00', 'PARTIALLY_PAID']
  );
  await pool.query(
    'INSERT INTO "InvoiceItem" (id, "invoiceId", "productId", "hsnCode", quantity, "unitPrice", "taxableAmount", "gstRate", cgst, sgst, igst, "totalAmount", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, 5.00, $8, $9, 0.00, $10, NOW())',
    [randomUUID(), inv1Id, productIds['PRD-001'], '21069099', '150.0000', '50.00', '7500.00', '187.50', '187.50', '7875.00']
  );

  const dsp1Id = randomUUID();
  await pool.query(
    'INSERT INTO "Dispatch" (id, "dispatchNumber", "invoiceId", "salesOrderId", "dispatchDate", status, notes, "createdAt") VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'1 day\', $5, $6, NOW())',
    [dsp1Id, 'DSP-2026-001', inv1Id, so1Id, 'COMPLETED', 'Gate Pass #GP-101 • TN-45-TR-4412']
  );
  await pool.query(
    'INSERT INTO "DispatchItem" (id, "dispatchId", "productId", "quantityDispatched", "createdAt") VALUES ($1, $2, $3, $4, NOW())',
    [randomUUID(), dsp1Id, productIds['PRD-001'], '150.0000']
  );
  await pool.query(
    'INSERT INTO "InventoryMovement" (id, "productId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW() - INTERVAL \'1 day\', NOW())',
    [randomUUID(), productIds['PRD-001'], 'FINISHED_GOODS', 'DISPATCH', '0.0000', '150.0000', '88.0000', 'PACKETS', 'DISPATCH', dsp1Id, userIds['ADMIN'], 'Dispatched against UF/2026-27/0001']
  );

  await pool.query(
    'INSERT INTO "Payment" (id, "paymentNumber", "customerId", "invoiceId", amount, "paymentMode", "referenceNumber", notes, "paymentDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL \'12 hours\', NOW())',
    [randomUUID(), 'PAY-2026-001', customerIds['CUST-001'], inv1Id, '4000.00', 'UPI', 'UPI-6332198471', 'Part payment received from Madurai Stores']
  );

  // Order 2: Invoiced & Ready for Dispatch
  const so2Id = randomUUID();
  await pool.query(
    'INSERT INTO "SalesOrder" (id, "orderNumber", "salesmanUserId", "customerId", "orderDate", status, subtotal, "taxTotal", "grandTotal", notes, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'6 hours\', $5, $6, $7, $8, $9, NOW(), NOW())',
    [so2Id, 'SO-2026-002', userIds['SALESMAN'], customerIds['CUST-003'], 'INVOICED', '2000.00', '100.00', '2100.00', 'Thillai Nagar Store Replenishment']
  );
  await pool.query(
    'INSERT INTO "SalesOrderItem" (id, "salesOrderId", "productId", quantity, "unitPrice", subtotal, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), so2Id, productIds['PRD-001'], '40.0000', '50.00', '2000.00']
  );

  const inv2Id = randomUUID();
  await pool.query(
    'INSERT INTO "Invoice" (id, "invoiceNumber", "salesOrderId", "customerId", "invoiceDate", "placeOfSupply", "taxableAmount", "gstRate", "cgstAmount", "sgstAmount", "igstAmount", "grandTotal", "balanceDue", status, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'5 hours\', $5, $6, 5.00, $7, $8, 0.00, $9, $10, $11, NOW(), NOW())',
    [inv2Id, 'UF/2026-27/0002', so2Id, customerIds['CUST-003'], 'Tamil Nadu (33)', '2000.00', '50.00', '50.00', '2100.00', '2100.00', 'UNPAID']
  );
  await pool.query(
    'INSERT INTO "InvoiceItem" (id, "invoiceId", "productId", "hsnCode", quantity, "unitPrice", "taxableAmount", "gstRate", cgst, sgst, igst, "totalAmount", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, 5.00, $8, $9, 0.00, $10, NOW())',
    [randomUUID(), inv2Id, productIds['PRD-001'], '21069099', '40.0000', '50.00', '2000.00', '50.00', '50.00', '2100.00']
  );

  // Order 3: Submitted (Awaiting Admin Approval)
  const so3Id = randomUUID();
  await pool.query(
    'INSERT INTO "SalesOrder" (id, "orderNumber", "salesmanUserId", "customerId", "orderDate", status, subtotal, "taxTotal", "grandTotal", notes, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'2 hours\', $5, $6, $7, $8, $9, NOW(), NOW())',
    [so3Id, 'SO-2026-003', userIds['SALESMAN'], customerIds['CUST-002'], 'SUBMITTED', '3000.00', '150.00', '3150.00', 'Bangalore Inter-State IGST Order']
  );
  await pool.query(
    'INSERT INTO "SalesOrderItem" (id, "salesOrderId", "productId", quantity, "unitPrice", subtotal, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), so3Id, productIds['PRD-001'], '60.0000', '50.00', '3000.00']
  );

  console.log('✅ Auto-seeded TRIMA ERP demo operations (GRNs, Production, Sales, GST Invoices, Dispatch, Payments).');
}
