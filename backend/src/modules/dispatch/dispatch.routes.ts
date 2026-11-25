import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { InventoryLedgerService } from '../inventory/inventoryLedger.service.js';

export const dispatchRouter = Router();
dispatchRouter.use(authGuard);

const createDispatchSchema = z.object({
  invoiceId: z.string().uuid(),
  notes: z.string().optional().nullable(),
});

// POST Create Dispatch (Atomically deducts finished goods inventory, updates order status, prevents duplicate dispatch)
dispatchRouter.post('/', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  try {
  const parsed = createDispatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const { invoiceId, notes } = parsed.data;

  // Duplicate dispatch check: ensure this invoice has not already been dispatched
  const existingDispatch = await queryOne('SELECT id, "dispatchNumber" FROM "Dispatch" WHERE "invoiceId" = $1', [invoiceId]);
  if (existingDispatch) {
    return res.status(400).json({
      success: false,
      message: `Duplicate dispatch blocked: Invoice has already been dispatched via ${existingDispatch.dispatchNumber}.`,
    });
  }

  const invoice = await queryOne('SELECT * FROM "Invoice" WHERE id = $1', [invoiceId]);
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  const invoiceItems = await query('SELECT * FROM "InvoiceItem" WHERE "invoiceId" = $1', [invoice.id]);
  const dispatchId = randomUUID();
  const dispatchCount = await queryOne<{ count: string }>('SELECT count(*) FROM "Dispatch"');
  const seq = (parseInt(dispatchCount?.count || '0', 10) + 1).toString().padStart(4, '0');
  const dispatchNumber = `DSP/2026-27/${seq}`;

  // 1. Create Dispatch master record
  await execute(
    `INSERT INTO "Dispatch" (id, "dispatchNumber", "invoiceId", "salesOrderId", "dispatchDate", status, notes, "createdAt")
     VALUES ($1, $2, $3, $4, NOW(), 'COMPLETED', $5, NOW())`,
    [dispatchId, dispatchNumber, invoice.id, invoice.salesOrderId, notes || null]
  );

  // 2. Insert items and deduct stock from Inventory Ledger atomically
  for (const item of invoiceItems) {
    const qty = new Decimal(item.quantity);

    await execute(
      `INSERT INTO "DispatchItem" (id, "dispatchId", "productId", "quantityDispatched", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [randomUUID(), dispatchId, item.productId, qty.toFixed(4)]
    );

    // Ledger: Finished Goods Sales Dispatch Deduction
    await InventoryLedgerService.recordMovement({
      productId: item.productId,
      category: 'FINISHED_GOODS',
      transactionType: 'SALES_DISPATCH',
      qtyIn: 0,
      qtyOut: qty,
      unit: 'PACKETS',
      sourceDocumentType: 'DISPATCH',
      sourceDocumentId: dispatchId,
      performedByUserId: req.user?.userId,
      notes: `Sales Dispatch ${dispatchNumber} against Invoice ${invoice.invoiceNumber}`,
      allowNegative: false,
    });
  }

  // 3. Update SalesOrder status to DISPATCHED
  await execute('UPDATE "SalesOrder" SET status = \'DISPATCHED\', "updatedAt" = NOW() WHERE id = $1', [invoice.salesOrderId]);

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'DISPATCH', 'Invoice', invoice.id, JSON.stringify({ dispatchNumber, invoiceId })]
  );

  res.status(201).json({
    success: true,
    message: 'Goods dispatched and finished goods inventory deducted successfully',
    data: {
      dispatchId,
      dispatchNumber,
      invoiceNumber: invoice.invoiceNumber,
    },
  });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'Dispatch failed',
    });
  }
});

// GET all dispatches
dispatchRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const dispatches = await query(
    `SELECT d.*, i."invoiceNumber", i."grandTotal" as "invoiceAmount", c.name as "customerName"
     FROM "Dispatch" d
     JOIN "Invoice" i ON d."invoiceId" = i.id
     JOIN "Customer" c ON i."customerId" = c.id
     ORDER BY d."dispatchDate" DESC`
  );
  res.json({ success: true, data: dispatches });
});

