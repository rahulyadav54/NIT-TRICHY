import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';

export const masterRouter = Router();

masterRouter.use(authGuard);

// ==========================================
// 1. PRODUCTS
// ==========================================
const productSchema = z.object({
  code: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  packSize: z.string().min(1),
  netWeightGrams: z.number().positive(),
  sellingPrice: z.number().positive(),
  hsnCode: z.string().default('21069099'),
  gstRate: z.number().default(5.0),
  active: z.boolean().default(true),
});

masterRouter.get('/products', async (req: AuthenticatedRequest, res: Response) => {
  const products = await query('SELECT * FROM "Product" ORDER BY name ASC');
  res.json({ success: true, data: products });
});

masterRouter.post('/products', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const data = parsed.data;
  const productId = randomUUID();
  const priceId = randomUUID();

  await execute(
    'INSERT INTO "Product" (id, code, sku, name, category, "packSize", "netWeightGrams", "sellingPrice", "hsnCode", "gstRate", unit, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())',
    [
      productId,
      data.code,
      data.sku,
      data.name,
      data.category,
      data.packSize,
      new Decimal(data.netWeightGrams).toFixed(2),
      new Decimal(data.sellingPrice).toFixed(2),
      data.hsnCode,
      new Decimal(data.gstRate).toFixed(2),
      'PACKETS',
      data.active,
    ]
  );

  await execute(
    'INSERT INTO "ProductPrice" (id, "productId", price, "isCurrent", "effectiveDate", "createdAt") VALUES ($1, $2, $3, true, NOW(), NOW())',
    [priceId, productId, new Decimal(data.sellingPrice).toFixed(2)]
  );

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CREATE', 'Product', productId, JSON.stringify(data)]
  );

  const created = await queryOne('SELECT * FROM "Product" WHERE id = $1', [productId]);
  res.status(201).json({ success: true, data: created });
});

// ==========================================
// 2. CUSTOMERS
// ==========================================
const customerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['RETAILER', 'DISTRIBUTOR']),
  gstin: z.string().min(15).max(15),
  billingAddress: z.string().min(1),
  shippingAddress: z.string().min(1),
  state: z.string().min(1),
  stateCode: z.string().length(2),
  phone: z.string().min(10),
  email: z.string().email().optional().nullable(),
  creditLimit: z.number().nonnegative().default(0),
  assignedSalesmanId: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

masterRouter.get('/customers', async (req: AuthenticatedRequest, res: Response) => {
  let sql = 'SELECT c.*, u.name as "assignedSalesmanName" FROM "Customer" c LEFT JOIN "User" u ON c."assignedSalesmanId" = u.id WHERE c.active = true';
  const params: any[] = [];

  if (req.user?.role === Role.SALESMAN) {
    sql += ' AND c."assignedSalesmanId" = $1';
    params.push(req.user.userId);
  }
  sql += ' ORDER BY c.name ASC';

  const customers = await query(sql, params);
  res.json({ success: true, data: customers });
});

masterRouter.post('/customers', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;
  const customerId = randomUUID();

  await execute(
    'INSERT INTO "Customer" (id, code, name, type, gstin, "billingAddress", "shippingAddress", state, "stateCode", phone, email, "creditLimit", "assignedSalesmanId", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())',
    [
      customerId,
      d.code,
      d.name,
      d.type,
      d.gstin,
      d.billingAddress,
      d.shippingAddress,
      d.state,
      d.stateCode,
      d.phone,
      d.email || null,
      new Decimal(d.creditLimit).toFixed(2),
      d.assignedSalesmanId || null,
      d.active,
    ]
  );

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CREATE', 'Customer', customerId, JSON.stringify(d)]
  );

  const created = await queryOne('SELECT * FROM "Customer" WHERE id = $1', [customerId]);
  res.status(201).json({ success: true, data: created });
});

// ==========================================
// 3. SUPPLIERS
// ==========================================
const supplierSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  gstin: z.string().min(15).max(15),
  contactInfo: z.string().min(1),
  address: z.string().min(1),
  state: z.string().min(1),
  stateCode: z.string().length(2),
  paymentTerms: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

masterRouter.get('/suppliers', async (req: AuthenticatedRequest, res: Response) => {
  const suppliers = await query('SELECT * FROM "Supplier" ORDER BY name ASC');
  res.json({ success: true, data: suppliers });
});

masterRouter.post('/suppliers', roleGuard([Role.ADMIN, Role.OWNER, Role.PRODUCTION_SUPERVISOR]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = supplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;
  const supplierId = randomUUID();

  await execute(
    'INSERT INTO "Supplier" (id, code, name, gstin, "contactInfo", address, state, "stateCode", "paymentTerms", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())',
    [supplierId, d.code, d.name, d.gstin, d.contactInfo, d.address, d.state, d.stateCode, d.paymentTerms || null, d.active]
  );

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CREATE', 'Supplier', supplierId, JSON.stringify(d)]
  );

  const created = await queryOne('SELECT * FROM "Supplier" WHERE id = $1', [supplierId]);
  res.status(201).json({ success: true, data: created });
});

// ==========================================
// 4. MATERIALS (Raw & Packaging)
// ==========================================
const materialSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['RAW_MATERIAL', 'PACKAGING']),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'PIECES', 'PACKETS', 'CARTONS']),
  openingStock: z.number().nonnegative().default(0),
  reorderLevel: z.number().nonnegative().default(0),
  purchaseRate: z.number().nonnegative().default(0),
  active: z.boolean().default(true),
});

masterRouter.get('/materials', async (req: AuthenticatedRequest, res: Response) => {
  const category = req.query.category as string;
  let sql = 'SELECT * FROM "Material"';
  const params: any[] = [];
  if (category) {
    sql += ' WHERE category = $1';
    params.push(category);
  }
  sql += ' ORDER BY name ASC';

  const materials = await query(sql, params);

  // Compute live ledger stock
  const materialsWithStock = await Promise.all(
    materials.map(async (m) => {
      const stockRes = await queryOne<{ currentStock: string }>(
        'SELECT COALESCE(SUM("qtyIn") - SUM("qtyOut"), 0) as "currentStock" FROM "InventoryMovement" WHERE "materialId" = $1',
        [m.id]
      );
      return {
        ...m,
        currentStock: parseFloat(stockRes?.currentStock || '0'),
      };
    })
  );

  res.json({ success: true, data: materialsWithStock });
});

masterRouter.post('/materials', roleGuard([Role.ADMIN, Role.OWNER, Role.PRODUCTION_SUPERVISOR]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = materialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;
  const materialId = randomUUID();

  await execute(
    'INSERT INTO "Material" (id, code, name, category, unit, "openingStock", "reorderLevel", "purchaseRate", active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())',
    [
      materialId,
      d.code,
      d.name,
      d.category,
      d.unit,
      new Decimal(d.openingStock).toFixed(4),
      new Decimal(d.reorderLevel).toFixed(4),
      new Decimal(d.purchaseRate).toFixed(2),
      d.active,
    ]
  );

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CREATE', 'Material', materialId, JSON.stringify(d)]
  );

  const created = await queryOne('SELECT * FROM "Material" WHERE id = $1', [materialId]);
  res.status(201).json({ success: true, data: created });
});

// ==========================================
// 5. USERS
// ==========================================
masterRouter.get('/users', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const users = await query('SELECT id, email, name, role, phone, active, "createdAt" FROM "User" ORDER BY role ASC');
  res.json({ success: true, data: users });
});

// ==========================================
// 6. RESET TRANSACTIONS (START FRESH)
// ==========================================
masterRouter.post('/reset-transactions', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const txTables = [
    'AuditLog',
    'Payment',
    'CreditNote',
    'DispatchItem',
    'Dispatch',
    'InvoiceItem',
    'Invoice',
    'SalesOrderItem',
    'SalesOrder',
    'ProductionConsumption',
    'ProductionRun',
    'PurchaseItem',
    'Purchase',
    'InventoryMovement',
  ];

  for (const t of txTables) {
    await execute(`DELETE FROM "${t}"`);
  }

  // Restore clean OPENING_STOCK ledger entries for all active Materials & PRD-001
  const mats = await query('SELECT id, category, "openingStock", unit FROM "Material" WHERE "openingStock" > 0');
  for (const m of mats) {
    await execute(
      'INSERT INTO "InventoryMovement" (id, "materialId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())',
      [randomUUID(), m.id, m.category, 'OPENING_STOCK', m.openingStock, '0.0000', m.openingStock, m.unit, 'OPENING', 'INIT-RESET', req.user?.userId || null, 'Opening Stock Balance']
    );
  }
  const prod = await queryOne('SELECT id FROM "Product" WHERE code = $1', ['PRD-001']);
  if (prod) {
    await execute(
      'INSERT INTO "InventoryMovement" (id, "productId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit, "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())',
      [randomUUID(), prod.id, 'FINISHED_GOODS', 'OPENING_STOCK', '50.0000', '0.0000', '50.0000', 'PACKETS', 'OPENING', 'INIT-RESET', req.user?.userId || null, 'Opening Finished Goods Balance']
    );
  }

  res.json({ success: true, message: 'All transactional records cleared. Master data & opening stock restored.' });
});
