import { Router, Response } from 'express';
import { query, queryOne } from '../../config/db.js';
import { authGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';

export const reportRouter = Router();
reportRouter.use(authGuard);

// Helper for date filtering clause
function getDateFilter(startDate?: string, endDate?: string, col = '"createdAt"') {
  let clause = '';
  const params: any[] = [];
  if (startDate) {
    params.push(new Date(startDate).toISOString());
    clause += ` AND ${col} >= $${params.length}`;
  }
  if (endDate) {
    params.push(new Date(endDate).toISOString());
    clause += ` AND ${col} <= $${params.length}`;
  }
  return { clause, params };
}

// 1. Sales Register
reportRouter.get('/sales-register', async (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const { clause, params } = getDateFilter(startDate, endDate, 'i."invoiceDate"');
  const sql = `
    SELECT i."invoiceNumber", i."invoiceDate", c.name as "customerName", c.gstin as "customerGstin",
           i."placeOfSupply", i."taxableAmount", i."cgstAmount", i."sgstAmount", i."igstAmount",
           i."grandTotal", i."balanceDue", i.status
    FROM "Invoice" i
    JOIN "Customer" c ON i."customerId" = c.id
    WHERE 1=1 ${clause}
    ORDER BY i."invoiceDate" DESC
  `;
  const data = await query(sql, params);
  res.json({ success: true, count: data.length, data });
});

// 2. Customer-Wise Sales
reportRouter.get('/customer-sales', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT c.id, c.code, c.name, c.type, c.state,
           COUNT(i.id) as "totalInvoices",
           COALESCE(SUM(i."taxableAmount"), 0) as "totalTaxable",
           COALESCE(SUM(i."grandTotal"), 0) as "totalSales",
           COALESCE(SUM(i."balanceDue"), 0) as "totalOutstanding"
    FROM "Customer" c
    LEFT JOIN "Invoice" i ON c.id = i."customerId"
    GROUP BY c.id, c.code, c.name, c.type, c.state
    ORDER BY "totalSales" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 3. Product-Wise Sales
reportRouter.get('/product-sales', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT p.id, p.code, p.name, p."packSize",
           COALESCE(SUM(ii.quantity), 0) as "totalQuantitySold",
           COALESCE(SUM(ii."taxableAmount"), 0) as "totalRevenue"
    FROM "Product" p
    LEFT JOIN "InvoiceItem" ii ON p.id = ii."productId"
    GROUP BY p.id, p.code, p.name, p."packSize"
    ORDER BY "totalRevenue" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 4. GST Outward Supplies Summary (GSTR-1 format)
reportRouter.get('/gst-summary', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT i."placeOfSupply",
           COALESCE(SUM(i."taxableAmount"), 0) as "totalTaxable",
           COALESCE(SUM(i."cgstAmount"), 0) as "totalCgst",
           COALESCE(SUM(i."sgstAmount"), 0) as "totalSgst",
           COALESCE(SUM(i."igstAmount"), 0) as "totalIgst",
           COALESCE(SUM(i."grandTotal"), 0) as "totalGrand"
    FROM "Invoice" i
    WHERE i.status != 'CANCELLED'
    GROUP BY i."placeOfSupply"
  `);
  res.json({ success: true, data });
});

// 5. Purchase Register
reportRouter.get('/purchase-register', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT p."poNumber", p."orderDate", p."receivedDate", s.name as "supplierName", s.gstin as "supplierGstin",
           p.subtotal, p."taxTotal", p."grandTotal", p.status
    FROM "Purchase" p
    JOIN "Supplier" s ON p."supplierId" = s.id
    ORDER BY p."orderDate" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 6. Raw Material Stock Summary
reportRouter.get('/raw-material-summary', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT m.id, m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel",
           COALESCE(SUM(im."qtyIn") - SUM(im."qtyOut"), 0) as "currentStock"
    FROM "Material" m
    LEFT JOIN "InventoryMovement" im ON m.id = im."materialId"
    WHERE m.category = 'RAW_MATERIAL'
    GROUP BY m.id, m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel"
    ORDER BY m.name ASC
  `);
  res.json({ success: true, data });
});

// 7. Packaging Stock Summary
reportRouter.get('/packaging-summary', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT m.id, m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel",
           COALESCE(SUM(im."qtyIn") - SUM(im."qtyOut"), 0) as "currentStock"
    FROM "Material" m
    LEFT JOIN "InventoryMovement" im ON m.id = im."materialId"
    WHERE m.category = 'PACKAGING'
    GROUP BY m.id, m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel"
    ORDER BY m.name ASC
  `);
  res.json({ success: true, data });
});

// 8. Finished Goods Stock Summary
reportRouter.get('/finished-goods-summary', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT p.id, p.code, p.name, p."packSize", p."sellingPrice",
           COALESCE(SUM(im."qtyIn") - SUM(im."qtyOut"), 0) as "currentStock"
    FROM "Product" p
    LEFT JOIN "InventoryMovement" im ON p.id = im."productId"
    GROUP BY p.id, p.code, p.name, p."packSize", p."sellingPrice"
    ORDER BY p.name ASC
  `);
  res.json({ success: true, data });
});

// 9. Stock Ledger (Detailed Movements)
reportRouter.get('/stock-ledger', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT im.id, im."transactionDate", im.category, im."transactionType",
           im."qtyIn", im."qtyOut", im."balanceAfter", im.unit,
           im."sourceDocumentType", im."sourceDocumentId",
           COALESCE(m.name, p.name) as "itemName",
           COALESCE(m.code, p.code) as "itemCode",
           u.name as "performedBy"
    FROM "InventoryMovement" im
    LEFT JOIN "Material" m ON im."materialId" = m.id
    LEFT JOIN "Product" p ON im."productId" = p.id
    LEFT JOIN "User" u ON im."performedByUserId" = u.id
    ORDER BY im."transactionDate" DESC, im."createdAt" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 10. Production Report
reportRouter.get('/production-report', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT pr."runNumber", pr."productionDate", p.name as "productName", pr."batchSize",
           pr."plannedOutput", pr."goodOutput", pr."damagedPackagingQty", pr."cartonsUsed",
           pr."yieldVariancePct", pr."costPerPacket", pr."totalCost"
    FROM "ProductionRun" pr
    JOIN "Product" p ON pr."productId" = p.id
    ORDER BY pr."productionDate" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 11. Planned vs Actual Material Consumption
reportRouter.get('/planned-vs-actual-consumption', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT pr."runNumber", pr."productionDate", m.name as "materialName", m.code as "materialCode",
           pc."plannedQty", pc."actualQty", pc."varianceQty", pc."variancePct", pc.unit
    FROM "ProductionConsumption" pc
    JOIN "ProductionRun" pr ON pc."productionRunId" = pr.id
    JOIN "Material" m ON pc."materialId" = m.id
    ORDER BY pr."productionDate" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 12. Yield & Wastage Report
reportRouter.get('/yield-wastage', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT pr."runNumber", pr."productionDate", p.name as "productName",
           pr."plannedOutput", pr."goodOutput",
           (pr."plannedOutput" - pr."goodOutput") as "wastageQty",
           pr."yieldVariancePct",
           pr."damagedPackagingQty" as "damagedPouches"
    FROM "ProductionRun" pr
    JOIN "Product" p ON pr."productId" = p.id
    ORDER BY pr."productionDate" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 13. Product Cost Report
reportRouter.get('/product-cost-report', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT pr."runNumber", p.name as "productName", pr."goodOutput",
           pr."materialCost", pr."packagingCost", pr."labourCost", pr."powerGasCost",
           pr."totalCost", pr."costPerPacket", p."sellingPrice",
           (p."sellingPrice" - pr."costPerPacket") as "grossMargin"
    FROM "ProductionRun" pr
    JOIN "Product" p ON pr."productId" = p.id
    ORDER BY pr."productionDate" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 14. Payments & Collections
reportRouter.get('/payments-report', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT pay."paymentNumber", pay."paymentDate", c.name as "customerName",
           i."invoiceNumber", pay.amount, pay."paymentMode", pay."referenceNumber"
    FROM "Payment" pay
    JOIN "Customer" c ON pay."customerId" = c.id
    LEFT JOIN "Invoice" i ON pay."invoiceId" = i.id
    ORDER BY pay."paymentDate" DESC
  `);
  res.json({ success: true, count: data.length, data });
});

// 15. Outstanding Receivables
reportRouter.get('/outstanding-receivables', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT c.code as "customerCode", c.name as "customerName", c.phone,
           i."invoiceNumber", i."invoiceDate", i."grandTotal", i."balanceDue"
    FROM "Invoice" i
    JOIN "Customer" c ON i."customerId" = c.id
    WHERE i."balanceDue" > 0 AND i.status != 'CANCELLED'
    ORDER BY i."invoiceDate" ASC
  `);
  res.json({ success: true, count: data.length, data });
});

// 16. Customer Ageing Report (0-30, 31-60, 61-90, 90+ days)
reportRouter.get('/customer-ageing', async (req: AuthenticatedRequest, res: Response) => {
  const data = await query(`
    SELECT c.name as "customerName", c.code as "customerCode",
           COALESCE(SUM(CASE WHEN (CURRENT_DATE - i."invoiceDate"::date) <= 30 THEN i."balanceDue" ELSE 0 END), 0) as "current_0_30",
           COALESCE(SUM(CASE WHEN (CURRENT_DATE - i."invoiceDate"::date) BETWEEN 31 AND 60 THEN i."balanceDue" ELSE 0 END), 0) as "age_31_60",
           COALESCE(SUM(CASE WHEN (CURRENT_DATE - i."invoiceDate"::date) BETWEEN 61 AND 90 THEN i."balanceDue" ELSE 0 END), 0) as "age_61_90",
           COALESCE(SUM(CASE WHEN (CURRENT_DATE - i."invoiceDate"::date) > 90 THEN i."balanceDue" ELSE 0 END), 0) as "age_above_90",
           COALESCE(SUM(i."balanceDue"), 0) as "totalBalance"
    FROM "Customer" c
    LEFT JOIN "Invoice" i ON c.id = i."customerId" AND i.status != 'CANCELLED'
    GROUP BY c.id, c.name, c.code
    HAVING COALESCE(SUM(i."balanceDue"), 0) > 0
  `);
  res.json({ success: true, count: data.length, data });
});

// ==========================================
// CSV & EXCEL EXPORTS (Unified across all reports)
// ==========================================
async function getExportRows(reportName: string, startDate?: string, endDate?: string): Promise<any[]> {
  switch (reportName) {
    case 'sales-register': {
      const { clause, params } = getDateFilter(startDate, endDate, 'i."invoiceDate"');
      return query(
        `SELECT i."invoiceNumber", i."invoiceDate", c.name as "customerName", c.gstin as "customerGstin",
                i."placeOfSupply", i."taxableAmount", i."cgstAmount", i."sgstAmount", i."igstAmount",
                i."grandTotal", i."balanceDue", i.status
         FROM "Invoice" i
         JOIN "Customer" c ON i."customerId" = c.id
         WHERE 1=1 ${clause}
         ORDER BY i."invoiceDate" DESC`,
        params
      );
    }
    case 'stock-ledger':
      return query(
        `SELECT im."transactionDate", im.category, im."transactionType",
                COALESCE(m.code, p.code) as "itemCode", COALESCE(m.name, p.name) as "itemName",
                im."qtyIn", im."qtyOut", im."balanceAfter", im.unit,
                im."sourceDocumentType", im."sourceDocumentId", u.name as "performedBy"
         FROM "InventoryMovement" im
         LEFT JOIN "Material" m ON im."materialId" = m.id
         LEFT JOIN "Product" p ON im."productId" = p.id
         LEFT JOIN "User" u ON im."performedByUserId" = u.id
         ORDER BY im."transactionDate" DESC, im."createdAt" DESC`
      );
    case 'raw-material-summary':
      return query(
        `SELECT m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel",
                COALESCE(SUM(im."qtyIn") - SUM(im."qtyOut"), 0) as "currentStock"
         FROM "Material" m
         LEFT JOIN "InventoryMovement" im ON m.id = im."materialId"
         WHERE m.category = 'RAW_MATERIAL'
         GROUP BY m.id, m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel"
         ORDER BY m.name ASC`
      );
    case 'packaging-summary':
      return query(
        `SELECT m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel",
                COALESCE(SUM(im."qtyIn") - SUM(im."qtyOut"), 0) as "currentStock"
         FROM "Material" m
         LEFT JOIN "InventoryMovement" im ON m.id = im."materialId"
         WHERE m.category = 'PACKAGING'
         GROUP BY m.id, m.code, m.name, m.unit, m."purchaseRate", m."reorderLevel"
         ORDER BY m.name ASC`
      );
    case 'finished-goods-summary':
      return query(
        `SELECT p.code, p.name, p."packSize", p."sellingPrice",
                COALESCE(SUM(im."qtyIn") - SUM(im."qtyOut"), 0) as "currentStock"
         FROM "Product" p
         LEFT JOIN "InventoryMovement" im ON p.id = im."productId"
         GROUP BY p.id, p.code, p.name, p."packSize", p."sellingPrice"
         ORDER BY p.name ASC`
      );
    case 'production-report':
      return query(
        `SELECT pr."runNumber", pr."productionDate", p.name as "productName", pr."batchSize",
                pr."plannedOutput", pr."goodOutput", pr."damagedPackagingQty", pr."cartonsUsed",
                pr."yieldVariancePct", pr."costPerPacket", pr."totalCost"
         FROM "ProductionRun" pr
         JOIN "Product" p ON pr."productId" = p.id
         ORDER BY pr."productionDate" DESC`
      );
    case 'planned-vs-actual-consumption':
      return query(
        `SELECT pr."runNumber", pr."productionDate", m.name as "materialName", m.code as "materialCode",
                pc."plannedQty", pc."actualQty", pc."varianceQty", pc."variancePct", pc.unit
         FROM "ProductionConsumption" pc
         JOIN "ProductionRun" pr ON pc."productionRunId" = pr.id
         JOIN "Material" m ON pc."materialId" = m.id
         ORDER BY pr."productionDate" DESC`
      );
    case 'yield-wastage':
      return query(
        `SELECT pr."runNumber", pr."productionDate", p.name as "productName",
                pr."plannedOutput", pr."goodOutput",
                (pr."plannedOutput" - pr."goodOutput") as "wastageQty",
                pr."yieldVariancePct", pr."damagedPackagingQty" as "damagedPouches"
         FROM "ProductionRun" pr
         JOIN "Product" p ON pr."productId" = p.id
         ORDER BY pr."productionDate" DESC`
      );
    case 'product-cost-report':
      return query(
        `SELECT pr."runNumber", p.name as "productName", pr."goodOutput",
                pr."materialCost", pr."packagingCost", pr."labourCost", pr."powerGasCost",
                pr."totalCost", pr."costPerPacket", p."sellingPrice",
                (p."sellingPrice" - pr."costPerPacket") as "grossMargin"
         FROM "ProductionRun" pr
         JOIN "Product" p ON pr."productId" = p.id
         ORDER BY pr."productionDate" DESC`
      );
    case 'purchase-register':
      return query(
        `SELECT p."poNumber", p."orderDate", p."receivedDate", s.name as "supplierName", s.gstin as "supplierGstin",
                p.subtotal, p."taxTotal", p."grandTotal", p.status
         FROM "Purchase" p
         JOIN "Supplier" s ON p."supplierId" = s.id
         ORDER BY p."orderDate" DESC`
      );
    case 'gst-summary':
      return query(
        `SELECT i."placeOfSupply",
                COALESCE(SUM(i."taxableAmount"), 0) as "totalTaxable",
                COALESCE(SUM(i."cgstAmount"), 0) as "totalCgst",
                COALESCE(SUM(i."sgstAmount"), 0) as "totalSgst",
                COALESCE(SUM(i."igstAmount"), 0) as "totalIgst",
                COALESCE(SUM(i."grandTotal"), 0) as "totalGrand"
         FROM "Invoice" i
         WHERE i.status != 'CANCELLED'
         GROUP BY i."placeOfSupply"`
      );
    case 'payments-report':
      return query(
        `SELECT pay."paymentNumber", pay."paymentDate", c.name as "customerName",
                i."invoiceNumber", pay.amount, pay."paymentMode", pay."referenceNumber"
         FROM "Payment" pay
         JOIN "Customer" c ON pay."customerId" = c.id
         LEFT JOIN "Invoice" i ON pay."invoiceId" = i.id
         ORDER BY pay."paymentDate" DESC`
      );
    case 'outstanding-receivables':
      return query(
        `SELECT c.code as "customerCode", c.name as "customerName", c.phone,
                i."invoiceNumber", i."invoiceDate", i."grandTotal", i."balanceDue"
         FROM "Invoice" i
         JOIN "Customer" c ON i."customerId" = c.id
         WHERE i."balanceDue" > 0 AND i.status != 'CANCELLED'
         ORDER BY i."invoiceDate" ASC`
      );
    case 'audit-trail':
      return query(
        `SELECT a.timestamp, u.name as "userName", u.role as "userRole", a.action,
                a."entityName", a."entityId", a."newValues"
         FROM "AuditLog" a
         LEFT JOIN "User" u ON a."userId" = u.id
         ORDER BY a.timestamp DESC LIMIT 100`
      );
    default:
      return query('SELECT code, name, category, "packSize", "sellingPrice", "hsnCode", "gstRate" FROM "Product"');
  }
}

reportRouter.get('/export/csv/:reportName', async (req: AuthenticatedRequest, res: Response) => {
  const reportName = req.params.reportName;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const rows = await getExportRows(reportName, startDate, endDate);

  const csv = stringify(rows, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${reportName}.csv"`);
  res.send(csv);
});

reportRouter.get('/export/excel/:reportName', async (req: AuthenticatedRequest, res: Response) => {
  const reportName = req.params.reportName;
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(reportName);

  const rows = await getExportRows(reportName, startDate, endDate);

  if (rows.length > 0) {
    worksheet.columns = Object.keys(rows[0]).map((key) => ({
      header: key,
      key,
      width: 22,
    }));
    rows.forEach((r) => worksheet.addRow(r));
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${reportName}.xlsx"`);
  await workbook.xlsx.write(res);
  res.end();
});

// ==========================================
// IMMUTABLE AUDIT TRAIL LOGS
// ==========================================
reportRouter.get('/audit-trail', async (req: AuthenticatedRequest, res: Response) => {
  const logs = await query(`
    SELECT a.*, u.name as "userName", u.email as "userEmail", u.role as "userRole"
    FROM "AuditLog" a
    LEFT JOIN "User" u ON a."userId" = u.id
    ORDER BY a.timestamp DESC
    LIMIT 100
  `);
  res.json({ success: true, count: logs.length, data: logs });
});

