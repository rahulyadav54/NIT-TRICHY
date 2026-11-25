import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { InventoryLedgerService } from '../inventory/inventoryLedger.service.js';

export const productionRouter = Router();
productionRouter.use(authGuard);

const actualMaterialConsumptionSchema = z.object({
  materialId: z.string().uuid(),
  actualQty: z.number().positive(),
  unit: z.enum(['KG', 'G', 'L', 'ML', 'PIECES', 'PACKETS', 'CARTONS']),
});

const createProductionRunSchema = z.object({
  productId: z.string().uuid(),
  bomId: z.string().uuid(),
  runNumber: z.string().min(1),
  batchSize: z.number().positive(),
  plannedOutput: z.number().positive(),
  goodOutput: z.number().nonnegative(),
  damagedPackagingQty: z.number().nonnegative().default(0), // Damaged pouches
  cartonsUsed: z.number().nonnegative().default(0),
  labourCost: z.number().nonnegative().default(0),
  powerGasCost: z.number().nonnegative().default(0),
  otherOverheads: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
  actualConsumptions: z.array(actualMaterialConsumptionSchema).min(1),
});

// GET all Production Runs with variance indicators
productionRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const runs = await query(
    `SELECT pr.*, p.name as "productName", p.code as "productCode", u.name as "supervisorName"
     FROM "ProductionRun" pr
     JOIN "Product" p ON pr."productId" = p.id
     JOIN "User" u ON pr."supervisorUserId" = u.id
     ORDER BY pr."productionDate" DESC`
  );

  const runsWithDetails = await Promise.all(
    runs.map(async (run) => {
      const consumptions = await query(
        `SELECT pc.*, m.name as "materialName", m.code as "materialCode", m.category as "materialCategory"
         FROM "ProductionConsumption" pc
         JOIN "Material" m ON pc."materialId" = m.id
         WHERE pc."productionRunId" = $1`,
        [run.id]
      );
      return { ...run, consumptions };
    })
  );

  res.json({ success: true, data: runsWithDetails });
});

// POST Record a Production Run (Deducts Raw & Packaging stock, Increases Finished Goods, Calculates Variances)
productionRouter.post('/', roleGuard([Role.ADMIN, Role.OWNER, Role.PRODUCTION_SUPERVISOR]), async (req: AuthenticatedRequest, res: Response) => {
  try {
  const parsed = createProductionRunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;

  // Zero output validation check
  if (d.goodOutput <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Zero good output is invalid. Production run must record positive good packets produced.',
    });
  }

  // Verify BOM existence
  const bom = await queryOne('SELECT * FROM "BOM" WHERE id = $1', [d.bomId]);
  if (!bom) {
    return res.status(404).json({ success: false, message: 'BOM not found' });
  }

  // Get standard BOM items to compute planned quantities and scale ratio
  const bomItems = await query('SELECT * FROM "BOMItem" WHERE "bomId" = $1', [bom.id]);
  const scaleRatio = new Decimal(d.plannedOutput).dividedBy(new Decimal(bom.expectedOutput));

  // Yield Variance calculation: ((Actual Output - Expected Output) / Expected Output) * 100
  const expectedOutputDec = new Decimal(d.plannedOutput);
  const goodOutputDec = new Decimal(d.goodOutput);
  const yieldVariancePct = goodOutputDec.minus(expectedOutputDec).dividedBy(expectedOutputDec).times(100);

  const yieldWarning = yieldVariancePct.abs().greaterThan(3.0); // 3% tolerance alert threshold

  const runId = randomUUID();

  // Validate and deduct raw material consumptions
  const consumptionRecords: any[] = [];
  let totalMaterialCost = new Decimal(0);
  let hasMaterialVarianceWarning = false;

  for (const actual of d.actualConsumptions) {
    const bomItem = bomItems.find((b) => b.materialId === actual.materialId);
    const standardQty = bomItem ? new Decimal(bomItem.standardQuantity).times(scaleRatio) : new Decimal(actual.actualQty);
    const actualQty = new Decimal(actual.actualQty);

    // Consumption Variance %: ((Actual Consumption - Planned Consumption) / Planned Consumption) * 100
    const varianceQty = actualQty.minus(standardQty);
    const variancePct = standardQty.isZero() ? new Decimal(0) : varianceQty.dividedBy(standardQty).times(100);

    if (variancePct.abs().greaterThan(3.0)) {
      hasMaterialVarianceWarning = true;
    }

    // Fetch material purchase rate / cost
    const mat = await queryOne('SELECT "purchaseRate", category FROM "Material" WHERE id = $1', [actual.materialId]);
    const unitRate = new Decimal(mat?.purchaseRate || 0);
    const totalCost = actualQty.times(unitRate);
    totalMaterialCost = totalMaterialCost.plus(totalCost);

    consumptionRecords.push({
      materialId: actual.materialId,
      plannedQty: standardQty,
      actualQty,
      varianceQty,
      variancePct,
      unitCost: unitRate,
      totalCost,
      unit: actual.unit,
      category: mat?.category || 'RAW_MATERIAL',
    });
  }

  // Calculate packaging costs and deductions (good pouches + damaged pouches, and cartons)
  // Benchmark Packaging Rule: Actual pouches consumed = good packets produced + damaged pouches
  const pouchMaterial = await queryOne('SELECT id, "purchaseRate" FROM "Material" WHERE code = $1', ['PKG-POUCH-200G']);
  const cartonMaterial = await queryOne('SELECT id, "purchaseRate" FROM "Material" WHERE code = $1', ['PKG-CARTON-20']);

  const totalPouchesUsed = goodOutputDec.plus(new Decimal(d.damagedPackagingQty));
  const pouchRate = new Decimal(pouchMaterial?.purchaseRate || 2.50);
  const pouchCost = totalPouchesUsed.times(pouchRate);

  const cartonsUsedDec = new Decimal(d.cartonsUsed);
  const cartonRate = new Decimal(cartonMaterial?.purchaseRate || 15.00);
  const cartonCost = cartonsUsedDec.times(cartonRate);

  const totalPackagingCost = pouchCost.plus(cartonCost);
  const labourCostDec = new Decimal(d.labourCost);
  const powerGasCostDec = new Decimal(d.powerGasCost);
  const otherOverheadsDec = new Decimal(d.otherOverheads);

  const totalProductionCost = totalMaterialCost
    .plus(totalPackagingCost)
    .plus(labourCostDec)
    .plus(powerGasCostDec)
    .plus(otherOverheadsDec);

  const costPerPacket = goodOutputDec.isZero() ? new Decimal(0) : totalProductionCost.dividedBy(goodOutputDec);

  // 1. Insert ProductionRun master record
  await execute(
    `INSERT INTO "ProductionRun" (
      id, "runNumber", "productId", "bomId", "batchSize", "plannedOutput", "goodOutput",
      "damagedPackagingQty", "cartonsUsed", "productionDate", "supervisorUserId",
      "labourCost", "powerGasCost", "otherOverheads", "materialCost", "packagingCost", "totalCost",
      "costPerPacket", "yieldVariancePct", status, notes, "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())`,
    [
      runId,
      d.runNumber,
      d.productId,
      d.bomId,
      new Decimal(d.batchSize).toFixed(4),
      expectedOutputDec.toFixed(4),
      goodOutputDec.toFixed(4),
      new Decimal(d.damagedPackagingQty).toFixed(4),
      cartonsUsedDec.toFixed(4),
      req.user?.userId,
      labourCostDec.toFixed(2),
      powerGasCostDec.toFixed(2),
      otherOverheadsDec.toFixed(2),
      totalMaterialCost.toFixed(2),
      totalPackagingCost.toFixed(2),
      totalProductionCost.toFixed(2),
      costPerPacket.toFixed(2),
      yieldVariancePct.toFixed(2),
      'COMPLETED',
      d.notes || null,
    ]
  );

  // 2. Insert Consumption records and Deduct Raw Materials from Ledger
  for (const cr of consumptionRecords) {
    await execute(
      `INSERT INTO "ProductionConsumption" (
        id, "productionRunId", "materialId", "plannedQty", "actualQty", "varianceQty", "variancePct",
        "unitCost", "totalCost", unit, "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        randomUUID(),
        runId,
        cr.materialId,
        cr.plannedQty.toFixed(4),
        cr.actualQty.toFixed(4),
        cr.varianceQty.toFixed(4),
        cr.variancePct.toFixed(2),
        cr.unitCost.toFixed(2),
        cr.totalCost.toFixed(2),
        cr.unit,
      ]
    );

    // Ledger: Raw Material Issue
    await InventoryLedgerService.recordMovement({
      materialId: cr.materialId,
      category: 'RAW_MATERIAL',
      transactionType: 'PRODUCTION_ISSUE',
      qtyIn: 0,
      qtyOut: cr.actualQty,
      unit: cr.unit,
      sourceDocumentType: 'PRODUCTION_RUN',
      sourceDocumentId: runId,
      performedByUserId: req.user?.userId,
      notes: `Production Run ${d.runNumber}: Consumed ${cr.actualQty} ${cr.unit}`,
    });
  }

  // 3. Deduct Pouches from Ledger (Good Packets + Damaged Pouches)
  if (pouchMaterial && totalPouchesUsed.greaterThan(0)) {
    await InventoryLedgerService.recordMovement({
      materialId: pouchMaterial.id,
      category: 'PACKAGING',
      transactionType: 'PRODUCTION_ISSUE',
      qtyIn: 0,
      qtyOut: totalPouchesUsed,
      unit: 'PIECES',
      sourceDocumentType: 'PRODUCTION_RUN',
      sourceDocumentId: runId,
      performedByUserId: req.user?.userId,
      notes: `Production Run ${d.runNumber}: Consumed ${totalPouchesUsed} pouches (${goodOutputDec} good + ${d.damagedPackagingQty} damaged)`,
    });
  }

  // 4. Deduct Cartons from Ledger
  if (cartonMaterial && cartonsUsedDec.greaterThan(0)) {
    await InventoryLedgerService.recordMovement({
      materialId: cartonMaterial.id,
      category: 'PACKAGING',
      transactionType: 'PRODUCTION_ISSUE',
      qtyIn: 0,
      qtyOut: cartonsUsedDec,
      unit: 'PIECES',
      sourceDocumentType: 'PRODUCTION_RUN',
      sourceDocumentId: runId,
      performedByUserId: req.user?.userId,
      notes: `Production Run ${d.runNumber}: Consumed ${cartonsUsedDec} cartons`,
    });
  }

  // 5. Credit Finished Goods to Ledger
  await InventoryLedgerService.recordMovement({
    productId: d.productId,
    category: 'FINISHED_GOODS',
    transactionType: 'PRODUCTION_RECEIPT',
    qtyIn: goodOutputDec,
    qtyOut: 0,
    unit: 'PACKETS',
    sourceDocumentType: 'PRODUCTION_RUN',
    sourceDocumentId: runId,
    performedByUserId: req.user?.userId,
    notes: `Production Run ${d.runNumber}: Good Output ${goodOutputDec} packets`,
  });

  // 6. Record Audit Log
  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [
      randomUUID(),
      req.user?.userId,
      'CREATE',
      'ProductionRun',
      runId,
      JSON.stringify({
        runNumber: d.runNumber,
        goodOutput: d.goodOutput,
        yieldVariancePct: yieldVariancePct.toNumber(),
        costPerPacket: costPerPacket.toNumber(),
      }),
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Production run completed and stock balances updated',
    data: {
      runId,
      yieldVariancePct: yieldVariancePct.toNumber(),
      yieldWarning,
      hasMaterialVarianceWarning,
      totalProductionCost: totalProductionCost.toNumber(),
      costPerPacket: costPerPacket.toNumber(),
    },
  });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'Production run failed',
    });
  }
});

