import { Router, Response } from 'express';
import { query } from '../../config/db.js';
import { authGuard, AuthenticatedRequest } from '../../middleware/auth.js';

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

