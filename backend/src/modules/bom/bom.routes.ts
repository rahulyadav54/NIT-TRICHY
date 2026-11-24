import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';

export const bomRouter = Router();
bomRouter.use(authGuard);

const bomItemSchema = z.object({
  materialId: z.string().uuid(),
  standardQuantity: z.number().positive(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'PIECES', 'PACKETS', 'CARTONS']),
});

const createBomSchema = z.object({
  productId: z.string().uuid(),
  bomNumber: z.string().min(1),
  version: z.number().int().positive().default(1),
  batchSize: z.number().positive(),
  expectedOutput: z.number().positive(),
  notes: z.string().optional().nullable(),
  items: z.array(bomItemSchema).min(1),
});

// GET all BOMs or BOM for product
bomRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const productId = req.query.productId as string;
  let sql = `
    SELECT b.*, p.name as "productName", p.code as "productCode" 
    FROM "BOM" b 
    JOIN "Product" p ON b."productId" = p.id 
    WHERE b."isActive" = true
  `;
  const params: any[] = [];
  if (productId) {
    sql += ' AND b."productId" = $1';
    params.push(productId);
  }
  sql += ' ORDER BY b."bomNumber" ASC';

  const boms = await query(sql, params);

  const bomsWithItems = await Promise.all(
    boms.map(async (bom) => {
      const items = await query(
        `SELECT bi.*, m.name as "materialName", m.code as "materialCode", m.category as "materialCategory"
         FROM "BOMItem" bi
         JOIN "Material" m ON bi."materialId" = m.id
         WHERE bi."bomId" = $1`,
        [bom.id]
      );
      return { ...bom, items };
    })
  );

  res.json({ success: true, data: bomsWithItems });
});

// GET BOM by ID with scaling calculations
bomRouter.get('/:id/scale', async (req: AuthenticatedRequest, res: Response) => {
  const targetOutput = parseFloat(req.query.targetOutput as string);
  const bom = await queryOne('SELECT * FROM "BOM" WHERE id = $1', [req.params.id]);

  if (!bom) {
    return res.status(404).json({ success: false, message: 'BOM not found' });
  }

  const items = await query(
    `SELECT bi.*, m.name as "materialName", m.code as "materialCode", m.category as "materialCategory"
     FROM "BOMItem" bi
     JOIN "Material" m ON bi."materialId" = m.id
     WHERE bi."bomId" = $1`,
    [bom.id]
  );

  const baseOutput = new Decimal(bom.expectedOutput);
  const target = targetOutput ? new Decimal(targetOutput) : baseOutput;
  const scaleRatio = target.dividedBy(baseOutput);

  const scaledItems = items.map((item) => {
    const stdQty = new Decimal(item.standardQuantity);
    const scaledQty = stdQty.times(scaleRatio);
    return {
      ...item,
      scaledQuantity: scaledQty.toNumber(),
    };
  });

  res.json({
    success: true,
    data: {
      bom,
      targetOutput: target.toNumber(),
      scaleRatio: scaleRatio.toNumber(),
      items: scaledItems,
    },
  });
});

// POST Create new BOM
bomRouter.post('/', roleGuard([Role.ADMIN, Role.OWNER, Role.PRODUCTION_SUPERVISOR]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createBomSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;
  const bomId = randomUUID();

  // If another active BOM exists for this product, deactivate or version increment
  await execute('UPDATE "BOM" SET "isActive" = false WHERE "productId" = $1 AND version = $2', [
    d.productId,
    d.version,
  ]);

  await execute(
    `INSERT INTO "BOM" (id, "bomNumber", "productId", version, "batchSize", "expectedOutput", notes, "isActive", "effectiveDate", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW(), NOW())`,
    [
      bomId,
      d.bomNumber,
      d.productId,
      d.version,
      new Decimal(d.batchSize).toFixed(4),
      new Decimal(d.expectedOutput).toFixed(4),
      d.notes || null,
    ]
  );

  for (const item of d.items) {
    await execute(
      `INSERT INTO "BOMItem" (id, "bomId", "materialId", "standardQuantity", unit, "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [randomUUID(), bomId, item.materialId, new Decimal(item.standardQuantity).toFixed(4), item.unit]
    );
  }

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CREATE', 'BOM', bomId, JSON.stringify(d)]
  );

  res.status(201).json({ success: true, message: 'BOM created successfully', bomId });
});

