import { Router, Response } from 'express';
import { query, queryOne } from '../../config/db.js';
import { authGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import Decimal from 'decimal.js';

export const costingRouter = Router();
costingRouter.use(authGuard);

/**
 * Service to calculate Weighted-Average Cost (WAC) for raw materials and packaging.
 * Formula:
 * Weighted Average Rate = (Opening Stock Value + Total Purchase Receipts Value) / (Opening Qty + Received Qty)
 */
export class CostingService {
  static async getWeightedAverageRate(materialId: string): Promise<Decimal> {
    const mat = await queryOne('SELECT * FROM "Material" WHERE id = $1', [materialId]);
    if (!mat) {
      return new Decimal(0);
    }

    const openingQty = new Decimal(mat.openingStock);
    const openingRate = new Decimal(mat.purchaseRate);
    let totalValue = openingQty.times(openingRate);
    let totalQty = openingQty;

    // Fetch all received purchase items for this material
    const purchaseItems = await query(
      `SELECT pi."receivedQty", pi."unitRate" 
       FROM "PurchaseItem" pi
       JOIN "Purchase" p ON pi."purchaseId" = p.id
       WHERE pi."materialId" = $1 AND p.status = 'RECEIVED'`,
      [materialId]
    );

    for (const pi of purchaseItems) {
      const recQty = new Decimal(pi.receivedQty);
      const rate = new Decimal(pi.unitRate);
      totalQty = totalQty.plus(recQty);
      totalValue = totalValue.plus(recQty.times(rate));
    }

    if (totalQty.isZero()) {
      return openingRate;
    }

    return totalValue.dividedBy(totalQty);
  }

  /**
   * Calculate complete batch costing breakdown for a given production run
   */
  static async getProductionRunCosting(runId: string) {
    const run = await queryOne('SELECT * FROM "ProductionRun" WHERE id = $1', [runId]);
    if (!run) {
      throw new Error('Production run not found');
    }

    const consumptions = await query(
      `SELECT pc.*, m.name as "materialName", m.code as "materialCode", m.category as "materialCategory"
       FROM "ProductionConsumption" pc
       JOIN "Material" m ON pc."materialId" = m.id
       WHERE pc."productionRunId" = $1`,
      [run.id]
    );

    let rawMaterialCost = new Decimal(0);
    for (const c of consumptions) {
      rawMaterialCost = rawMaterialCost.plus(new Decimal(c.totalCost));
    }

    const packagingCost = new Decimal(run.packagingCost);
    const labourCost = new Decimal(run.labourCost);
    const powerGasCost = new Decimal(run.powerGasCost);
    const otherOverheads = new Decimal(run.otherOverheads);

    const totalBatchCost = rawMaterialCost
      .plus(packagingCost)
      .plus(labourCost)
      .plus(powerGasCost)
      .plus(otherOverheads);

    const goodPackets = new Decimal(run.goodOutput);
    const costPerPacket = goodPackets.isZero() ? new Decimal(0) : totalBatchCost.dividedBy(goodPackets);

    // Fetch product selling price to compute estimated gross margin
    const product = await queryOne('SELECT * FROM "Product" WHERE id = $1', [run.productId]);
    const sellingPrice = new Decimal(product?.sellingPrice || 50.0);
    const grossMarginPerPacket = sellingPrice.minus(costPerPacket);
    const grossMarginPct = sellingPrice.isZero() ? new Decimal(0) : grossMarginPerPacket.dividedBy(sellingPrice).times(100);

    return {
      runId: run.id,
      runNumber: run.runNumber,
      goodOutput: goodPackets.toNumber(),
      sellingPrice: sellingPrice.toNumber(),
      costBreakdown: {
        rawMaterialCost: rawMaterialCost.toNumber(),
        packagingCost: packagingCost.toNumber(),
        labourCost: labourCost.toNumber(),
        powerGasCost: powerGasCost.toNumber(),
        otherOverheads: otherOverheads.toNumber(),
        totalBatchCost: totalBatchCost.toNumber(),
      },
      unitCost: {
        costPerPacket: costPerPacket.toNumber(),
        grossMarginPerPacket: grossMarginPerPacket.toNumber(),
        grossMarginPct: grossMarginPct.toNumber(),
      },
      consumptions,
    };
  }
}

// GET Costing Dashboard analytics
costingRouter.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  const runs = await query('SELECT id FROM "ProductionRun" ORDER BY "productionDate" DESC LIMIT 10');
  const details = await Promise.all(runs.map((r) => CostingService.getProductionRunCosting(r.id)));

  // Calculate overall live inventory valuation (Raw materials + Packaging + Finished goods)
  const materials = await query('SELECT * FROM "Material" WHERE active = true');
  let rawMaterialValuation = new Decimal(0);
  let packagingValuation = new Decimal(0);

  for (const m of materials) {
    const wac = await CostingService.getWeightedAverageRate(m.id);
    const stockRes = await queryOne<{ balance: string }>(
      'SELECT COALESCE(SUM("qtyIn") - SUM("qtyOut"), 0) as balance FROM "InventoryMovement" WHERE "materialId" = $1',
      [m.id]
    );
    const stock = new Decimal(stockRes?.balance || '0');
    const val = stock.times(wac);

    if (m.category === 'RAW_MATERIAL') {
      rawMaterialValuation = rawMaterialValuation.plus(val);
    } else {
      packagingValuation = packagingValuation.plus(val);
    }
  }

  // Finished Goods Valuation (Valued at standard product selling price or latest batch cost)
  const products = await query('SELECT * FROM "Product" WHERE active = true');
  let finishedGoodsValuation = new Decimal(0);
  for (const p of products) {
    const stockRes = await queryOne<{ balance: string }>(
      'SELECT COALESCE(SUM("qtyIn") - SUM("qtyOut"), 0) as balance FROM "InventoryMovement" WHERE "productId" = $1',
      [p.id]
    );
    const stock = new Decimal(stockRes?.balance || '0');
    finishedGoodsValuation = finishedGoodsValuation.plus(stock.times(new Decimal(p.sellingPrice)));
  }

  res.json({
    success: true,
    data: {
      recentBatchCosting: details,
      inventoryValuation: {
        rawMaterialValuation: rawMaterialValuation.toNumber(),
        packagingValuation: packagingValuation.toNumber(),
        finishedGoodsValuation: finishedGoodsValuation.toNumber(),
        totalValuation: rawMaterialValuation.plus(packagingValuation).plus(finishedGoodsValuation).toNumber(),
      },
    },
  });
});

// GET Costing breakdown for specific production run
costingRouter.get('/run/:runId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const costing = await CostingService.getProductionRunCosting(req.params.runId);
    res.json({ success: true, data: costing });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message || 'Costing not found' });
  }
});

