import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { InventoryLedgerService } from '../inventory/inventoryLedger.service.js';

export const salesRouter = Router();
salesRouter.use(authGuard);

const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  orderNumber: z.string().min(1),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemInputSchema).min(1),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'DRAFT', 'SUBMITTED']),
  notes: z.string().optional().nullable(),
});

// GET all orders (Filtered to salesman's portfolio if role is SALESMAN)
salesRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  let sql = `
    SELECT so.*, c.name as "customerName", c.code as "customerCode", c.state as "customerState",
           c.type as "customerType", u.name as "salesmanName"
    FROM "SalesOrder" so
    JOIN "Customer" c ON so."customerId" = c.id
    JOIN "User" u ON so."salesmanUserId" = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (req.user?.role === Role.SALESMAN) {
    sql += ' AND so."salesmanUserId" = $1';
    params.push(req.user.userId);
  }

  sql += ' ORDER BY so."orderDate" DESC, so."createdAt" DESC';

  const orders = await query(sql, params);

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await query(
        `SELECT soi.*, p.name as "productName", p.code as "productCode", p.packSize as "packSize"
         FROM "SalesOrderItem" soi
         JOIN "Product" p ON soi."productId" = p.id
         WHERE soi."salesOrderId" = $1`,
        [order.id]
      );
      return { ...order, items };
    })
  );

  res.json({ success: true, data: ordersWithItems });
});

// GET Order by ID
salesRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const order = await queryOne(
    `SELECT so.*, c.name as "customerName", c.code as "customerCode", c.state as "customerState",
            c."stateCode" as "customerStateCode", c.gstin as "customerGstin", c.type as "customerType",
            u.name as "salesmanName"
     FROM "SalesOrder" so
     JOIN "Customer" c ON so."customerId" = c.id
     JOIN "User" u ON so."salesmanUserId" = u.id
     WHERE so.id = $1`,
    [req.params.id]
  );

  if (!order) {
    return res.status(404).json({ success: false, message: 'Sales order not found' });
  }

  // Security check: if salesman, ensure customer is assigned
  if (req.user?.role === Role.SALESMAN && order.salesmanUserId !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Forbidden: You cannot view orders for unassigned customers.' });
  }

  const items = await query(
    `SELECT soi.*, p.name as "productName", p.code as "productCode", p."packSize" as "packSize", p."hsnCode"
     FROM "SalesOrderItem" soi
     JOIN "Product" p ON soi."productId" = p.id
     WHERE soi."salesOrderId" = $1`,
    [order.id]
  );

  // Check finished goods stock availability for items
  const itemsWithStock = await Promise.all(
    items.map(async (item) => {
      const availableStock = await InventoryLedgerService.getCurrentStock(item.productId, true);
      const reqQty = new Decimal(item.quantity);
      return {
        ...item,
        availableStock: availableStock.toNumber(),
        isAvailable: availableStock.greaterThanOrEqualTo(reqQty),
        shortage: availableStock.lessThan(reqQty) ? reqQty.minus(availableStock).toNumber() : 0,
      };
    })
  );

  res.json({ success: true, data: { ...order, items: itemsWithStock } });
});

// POST Create Sales Order (Salesman mobile flow: < 1 min, price snapshotted)
salesRouter.post('/', roleGuard([Role.SALESMAN, Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;

  // Verify customer assignment if role is SALESMAN
  const customer = await queryOne('SELECT * FROM "Customer" WHERE id = $1', [d.customerId]);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found' });
  }

  if (req.user?.role === Role.SALESMAN && customer.assignedSalesmanId && customer.assignedSalesmanId !== req.user.userId) {
    return res.status(403).json({ success: false, message: 'Forbidden: You are not assigned to this customer.' });
  }

  const orderId = randomUUID();
  let subtotal = new Decimal(0);
  const itemsToInsert: any[] = [];

  for (const item of d.items) {
    const product = await queryOne('SELECT * FROM "Product" WHERE id = $1', [item.productId]);
    if (!product) {
      return res.status(404).json({ success: false, message: `Product ${item.productId} not found` });
    }

    // Historical Price Snapshotting: Fetch active price for product
    const priceRecord = await queryOne(
      'SELECT price FROM "ProductPrice" WHERE "productId" = $1 AND "isCurrent" = true',
      [product.id]
    );
    const unitPrice = new Decimal(priceRecord ? priceRecord.price : product.sellingPrice);
    const qty = new Decimal(item.quantity);
    const itemSub = qty.times(unitPrice);

    subtotal = subtotal.plus(itemSub);

    itemsToInsert.push({
      productId: product.id,
      quantity: qty,
      unitPrice,
      subtotal: itemSub,
    });
  }

  // 5% standard benchmark GST calculation
  const taxTotal = subtotal.times(0.05);
  const grandTotal = subtotal.plus(taxTotal);

  await execute(
    `INSERT INTO "SalesOrder" (
      id, "orderNumber", "salesmanUserId", "customerId", "orderDate", status,
      subtotal, "taxTotal", "grandTotal", notes, "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, NOW(), 'SUBMITTED', $5, $6, $7, $8, NOW(), NOW())`,
    [
      orderId,
      d.orderNumber,
      req.user?.userId,
      d.customerId,
      subtotal.toFixed(2),
      taxTotal.toFixed(2),
      grandTotal.toFixed(2),
      d.notes || null,
    ]
  );

  for (const it of itemsToInsert) {
    await execute(
      `INSERT INTO "SalesOrderItem" (id, "salesOrderId", "productId", quantity, "unitPrice", subtotal, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [randomUUID(), orderId, it.productId, it.quantity.toFixed(4), it.unitPrice.toFixed(2), it.subtotal.toFixed(2)]
    );
  }

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CREATE', 'SalesOrder', orderId, JSON.stringify({ orderNumber: d.orderNumber, grandTotal: grandTotal.toNumber() })]
  );

  res.status(201).json({
    success: true,
    message: 'Sales order submitted successfully',
    data: {
      orderId,
      orderNumber: d.orderNumber,
      subtotal: subtotal.toNumber(),
      grandTotal: grandTotal.toNumber(),
    },
  });
});

// PATCH Approve or Reject Order (Admin workflow with finished goods stock verification)
salesRouter.patch('/:id/status', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = updateOrderStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { status, notes } = parsed.data;
  const order = await queryOne('SELECT * FROM "SalesOrder" WHERE id = $1', [req.params.id]);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Sales order not found' });
  }

  // If APPROVING, check finished goods stock availability
  if (status === 'APPROVED') {
    const items = await query('SELECT * FROM "SalesOrderItem" WHERE "salesOrderId" = $1', [order.id]);
    for (const it of items) {
      const currentStock = await InventoryLedgerService.getCurrentStock(it.productId, true);
      const reqQty = new Decimal(it.quantity);
      if (currentStock.lessThan(reqQty)) {
        const shortage = reqQty.minus(currentStock);
        return res.status(400).json({
          success: false,
          code: 'INSUFFICIENT_STOCK',
          message: `Cannot approve order ${order.orderNumber}: Insufficient finished goods stock. Requested ${reqQty} pkts, Available ${currentStock} pkts. Shortage: ${shortage} pkts.`,
          details: {
            productId: it.productId,
            requestedQuantity: reqQty.toNumber(),
            availableStock: currentStock.toNumber(),
            shortage: shortage.toNumber(),
          },
        });
      }
    }
  }

  await execute(
    'UPDATE "SalesOrder" SET status = $1, notes = COALESCE($2, notes), "updatedAt" = NOW() WHERE id = $3',
    [status, notes || null, order.id]
  );

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [
      randomUUID(),
      req.user?.userId,
      status === 'APPROVED' ? 'APPROVE' : 'REJECT',
      'SalesOrder',
      order.id,
      JSON.stringify({ previousStatus: order.status, newStatus: status, notes }),
    ]
  );

  res.json({
    success: true,
    message: `Order ${order.orderNumber} ${status.toLowerCase()} successfully`,
    status,
  });
});
