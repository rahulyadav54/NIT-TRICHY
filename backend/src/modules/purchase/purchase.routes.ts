import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { InventoryLedgerService } from '../inventory/inventoryLedger.service.js';

export const purchaseRouter = Router();
purchaseRouter.use(authGuard);

const purchaseItemSchema = z.object({
  materialId: z.string().uuid(),
  orderedQty: z.number().positive(),
  receivedQty: z.number().nonnegative(),
  unitRate: z.number().positive(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'PIECES', 'PACKETS', 'CARTONS']),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().uuid(),
  poNumber: z.string().min(1),
  status: z.enum(['ORDERED', 'RECEIVED']).default('RECEIVED'),
  notes: z.string().optional().nullable(),
  items: z.array(purchaseItemSchema).min(1),
});

// GET all Purchases
purchaseRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const purchases = await query(
    `SELECT p.*, s.name as "supplierName", s.code as "supplierCode"
     FROM "Purchase" p
     JOIN "Supplier" s ON p."supplierId" = s.id
     ORDER BY p."orderDate" DESC`
  );

  const purchasesWithItems = await Promise.all(
    purchases.map(async (p) => {
      const items = await query(
        `SELECT pi.*, m.name as "materialName", m.code as "materialCode"
         FROM "PurchaseItem" pi
         JOIN "Material" m ON pi."materialId" = m.id
         WHERE pi."purchaseId" = $1`,
        [p.id]
      );
      return { ...p, items };
    })
  );

  res.json({ success: true, data: purchasesWithItems });
});

// POST Create and Receive Purchase Order (Automatically updates Inventory Ledger)
purchaseRouter.post('/', roleGuard([Role.ADMIN, Role.OWNER, Role.PRODUCTION_SUPERVISOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
  const parsed = createPurchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;
  const purchaseId = randomUUID();

  let subtotal = new Decimal(0);
  for (const item of d.items) {
    const itemSub = new Decimal(item.receivedQty).times(new Decimal(item.unitRate));
    subtotal = subtotal.plus(itemSub);
  }
  const taxTotal = subtotal.times(0.05); // 5% GST on snacks/inputs
  const grandTotal = subtotal.plus(taxTotal);

  await execute(
    `INSERT INTO "Purchase" (id, "poNumber", "supplierId", "orderDate", "receivedDate", status, subtotal, "taxTotal", "grandTotal", notes, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, NOW(), NOW(), $4, $5, $6, $7, $8, NOW(), NOW())`,
    [
      purchaseId,
      d.poNumber,
      d.supplierId,
      d.status,
      subtotal.toFixed(2),
      taxTotal.toFixed(2),
      grandTotal.toFixed(2),
      d.notes || null,
    ]
  );

  for (const item of d.items) {
    const itemSub = new Decimal(item.receivedQty).times(new Decimal(item.unitRate));
    await execute(
      `INSERT INTO "PurchaseItem" (id, "purchaseId", "materialId", "orderedQty", "receivedQty", "unitRate", subtotal, unit, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        randomUUID(),
        purchaseId,
        item.materialId,
        new Decimal(item.orderedQty).toFixed(4),
        new Decimal(item.receivedQty).toFixed(4),
        new Decimal(item.unitRate).toFixed(2),
        itemSub.toFixed(2),
        item.unit,
      ]
    );

    // If status is RECEIVED, automatically record inventory movement!
    if (d.status === 'RECEIVED' && item.receivedQty > 0) {
      const mat = await queryOne('SELECT category FROM "Material" WHERE id = $1', [item.materialId]);
      await InventoryLedgerService.recordMovement({
        materialId: item.materialId,
        category: mat?.category || 'RAW_MATERIAL',
        transactionType: 'PURCHASE_RECEIPT',
        qtyIn: item.receivedQty,
        qtyOut: 0,
        unit: item.unit,
        sourceDocumentType: 'PURCHASE',
        sourceDocumentId: purchaseId,
        performedByUserId: req.user?.userId,
        notes: `Purchase Receipt PO: ${d.poNumber} @ ₹${item.unitRate}/${item.unit}`,
      });
    }
  }

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CREATE', 'Purchase', purchaseId, JSON.stringify(d)]
  );

  res.status(201).json({ success: true, message: 'Purchase recorded and stock updated', purchaseId });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'Failed to record purchase order',
    });
  }
});

