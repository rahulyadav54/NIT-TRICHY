import { Router, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Role } from '@prisma/client';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { InventoryLedgerService } from './inventoryLedger.service.js';

export const inventoryRouter = Router();
inventoryRouter.use(authGuard);

// GET Stock Ledger movements
inventoryRouter.get('/ledger', async (req: AuthenticatedRequest, res: Response) => {
  const materialId = req.query.materialId as string;
  const productId = req.query.productId as string;

  let sql = `
    SELECT im.*, 
           m.name as "materialName", m.code as "materialCode",
           p.name as "productName", p.code as "productCode",
           u.name as "performedByName"
    FROM "InventoryMovement" im
    LEFT JOIN "Material" m ON im."materialId" = m.id
    LEFT JOIN "Product" p ON im."productId" = p.id
    LEFT JOIN "User" u ON im."performedByUserId" = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (materialId) {
    sql += ' AND im."materialId" = $1';
    params.push(materialId);
  }
  if (productId) {
    sql += ' AND im."productId" = $1';
    params.push(productId);
  }

  sql += ' ORDER BY im."transactionDate" DESC, im."createdAt" DESC';

  const movements = await query(sql, params);
  res.json({ success: true, data: movements });
});

// GET Low Stock Alerts
inventoryRouter.get('/alerts/low-stock', async (req: AuthenticatedRequest, res: Response) => {
  const materials = await query('SELECT * FROM "Material" WHERE active = true');

  const alerts = [];
  for (const m of materials) {
    const stockRes = await query(
      'SELECT COALESCE(SUM("qtyIn") - SUM("qtyOut"), 0) as balance FROM "InventoryMovement" WHERE "materialId" = $1',
      [m.id]
    );
    const balance = parseFloat(stockRes[0]?.balance || '0');
    const reorder = parseFloat(m.reorderLevel.toString());

    if (balance <= reorder) {
      alerts.push({
        materialId: m.id,
        code: m.code,
        name: m.name,
        category: m.category,
        unit: m.unit,
        currentStock: balance,
        reorderLevel: reorder,
        shortage: reorder - balance,
      });
    }
  }

  res.json({ success: true, data: alerts });
});

const issueMaterialSchema = z.object({
  materialId: z.string().uuid(),
  quantity: z.number().positive(),
  transactionType: z.enum(['PRODUCTION_ISSUE', 'ADJUSTMENT']).default('PRODUCTION_ISSUE'),
  notes: z.string().min(2).max(250),
});

// POST Record Raw Material Issue or Wastage Adjustment
inventoryRouter.post(
  '/issue',
  roleGuard([Role.ADMIN, Role.OWNER, Role.PRODUCTION_SUPERVISOR]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = issueMaterialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, errors: parsed.error.errors });
      }
      const d = parsed.data;
      const mat = await queryOne('SELECT * FROM "Material" WHERE id = $1', [d.materialId]);
      if (!mat) {
        return res.status(404).json({ success: false, message: 'Material not found' });
      }

      const refId = `ISS-${Date.now().toString().slice(-6)}`;
      const result = await InventoryLedgerService.recordMovement({
        materialId: mat.id,
        category: mat.category,
        transactionType: d.transactionType as any,
        qtyOut: d.quantity,
        unit: mat.unit,
        sourceDocumentType: d.transactionType === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'PRODUCTION_RUN',
        sourceDocumentId: refId,
        performedByUserId: req.user?.userId,
        notes: d.notes,
      });

      await execute(
        'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
        [randomUUID(), req.user?.userId, d.transactionType, 'Material', mat.id, JSON.stringify({ refId, quantity: d.quantity, notes: d.notes })]
      );

      res.status(201).json({
        success: true,
        data: { movementId: result.id, balanceAfter: result.balanceAfter.toNumber(), refId },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message || 'Failed to record material issue' });
    }
  }
);

