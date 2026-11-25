import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { config } from '../../config/env.js';
import { InventoryLedgerService } from '../inventory/inventoryLedger.service.js';

export const invoiceRouter = Router();
invoiceRouter.use(authGuard);

// Generate sequential GST tax invoice from approved sales order
invoiceRouter.post('/from-order/:orderId', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const order = await queryOne(
    `SELECT so.*, c.name as "customerName", c.code as "customerCode", c.state as "customerState",
            c."stateCode" as "customerStateCode", c.gstin as "customerGstin", c."billingAddress",
            c."shippingAddress"
     FROM "SalesOrder" so
     JOIN "Customer" c ON so."customerId" = c.id
     WHERE so.id = $1`,
    [req.params.orderId]
  );

  if (!order) {
    return res.status(404).json({ success: false, message: 'Sales order not found' });
  }

  if (order.status !== 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: `Cannot invoice order with status '${order.status}'. Order must be APPROVED first.`,
    });
  }

  const items = await query(
    `SELECT soi.*, p.name as "productName", p.code as "productCode", p."hsnCode", p."gstRate"
     FROM "SalesOrderItem" soi
     JOIN "Product" p ON soi."productId" = p.id
     WHERE soi."salesOrderId" = $1`,
    [order.id]
  );

  // Pre-dispatch inventory availability verification: Do not generate a valid invoice for unavailable goods
  for (const it of items) {
    const availableStock = await InventoryLedgerService.getCurrentStock(it.productId, true);
    const reqQty = new Decimal(it.quantity);
    if (availableStock.lessThan(reqQty)) {
      const shortage = reqQty.minus(availableStock);
      return res.status(400).json({
        success: false,
        code: 'INSUFFICIENT_STOCK',
        message: `Cannot generate invoice: Insufficient finished goods stock for ${it.productName}. Requested ${reqQty} pkts, Available ${availableStock} pkts. Shortage: ${shortage} pkts.`,
        details: {
          productId: it.productId,
          productName: it.productName,
          requestedQty: reqQty.toNumber(),
          availableStock: availableStock.toNumber(),
          shortage: shortage.toNumber(),
        },
      });
    }
  }

  // Statutory Place of Supply GST Logic
  // Supplier State: Tamil Nadu (33)
  // If Customer State == Supplier State -> Intra-state: CGST (2.5%) + SGST (2.5%)
  // If Customer State != Supplier State -> Inter-state: IGST (5.0%)
  const isIntraState = order.customerStateCode === config.company.stateCode;

  let taxableAmount = new Decimal(0);
  let cgstTotal = new Decimal(0);
  let sgstTotal = new Decimal(0);
  let igstTotal = new Decimal(0);

  const calculatedItems = items.map((it) => {
    const itemTaxable = new Decimal(it.subtotal);
    taxableAmount = taxableAmount.plus(itemTaxable);

    let itemCgst = new Decimal(0);
    let itemSgst = new Decimal(0);
    let itemIgst = new Decimal(0);

    if (isIntraState) {
      // 5% split into 2.5% CGST + 2.5% SGST
      itemCgst = itemTaxable.times(0.025);
      itemSgst = itemTaxable.times(0.025);
      cgstTotal = cgstTotal.plus(itemCgst);
      sgstTotal = sgstTotal.plus(itemSgst);
    } else {
      // 5% IGST
      itemIgst = itemTaxable.times(0.05);
      igstTotal = igstTotal.plus(itemIgst);
    }

    const itemTotal = itemTaxable.plus(itemCgst).plus(itemSgst).plus(itemIgst);
    return {
      ...it,
      itemTaxable,
      itemCgst,
      itemSgst,
      itemIgst,
      itemTotal,
    };
  });

  const grandTotal = taxableAmount.plus(cgstTotal).plus(sgstTotal).plus(igstTotal);

  // Financial-year sequential invoice numbering: e.g. UF/2026-27/0001
  const countRes = await queryOne<{ count: string }>('SELECT count(*) FROM "Invoice"');
  const seq = (parseInt(countRes?.count || '0', 10) + 1).toString().padStart(4, '0');
  const invoiceNumber = `UF/2026-27/${seq}`;

  const invoiceId = randomUUID();

  // Create Invoice record
  await execute(
    `INSERT INTO "Invoice" (
      id, "invoiceNumber", "salesOrderId", "customerId", "invoiceDate", "placeOfSupply",
      "taxableAmount", "gstRate", "cgstAmount", "sgstAmount", "igstAmount", "grandTotal", "balanceDue",
      status, "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, 5.00, $7, $8, $9, $10, $11, 'ISSUED', NOW(), NOW())`,
    [
      invoiceId,
      invoiceNumber,
      order.id,
      order.customerId,
      `${order.customerState} (${order.customerStateCode})`,
      taxableAmount.toFixed(2),
      cgstTotal.toFixed(2),
      sgstTotal.toFixed(2),
      igstTotal.toFixed(2),
      grandTotal.toFixed(2),
      grandTotal.toFixed(2), // Initial balance due == grand total
    ]
  );

  // Create Invoice Items
  for (const ci of calculatedItems) {
    await execute(
      `INSERT INTO "InvoiceItem" (
        id, "invoiceId", "productId", "hsnCode", quantity, "unitPrice", "taxableAmount",
        "gstRate", cgst, sgst, igst, "totalAmount", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 5.00, $8, $9, $10, $11, NOW())`,
      [
        randomUUID(),
        invoiceId,
        ci.productId,
        ci.hsnCode,
        new Decimal(ci.quantity).toFixed(4),
        new Decimal(ci.unitPrice).toFixed(2),
        ci.itemTaxable.toFixed(2),
        ci.itemCgst.toFixed(2),
        ci.itemSgst.toFixed(2),
        ci.itemIgst.toFixed(2),
        ci.itemTotal.toFixed(2),
      ]
    );
  }

  // Update order status to INVOICED
  await execute('UPDATE "SalesOrder" SET status = \'INVOICED\', "updatedAt" = NOW() WHERE id = $1', [order.id]);

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [
      randomUUID(),
      req.user?.userId,
      'CREATE',
      'Invoice',
      invoiceId,
      JSON.stringify({ invoiceNumber, grandTotal: grandTotal.toNumber() }),
    ]
  );

  res.status(201).json({
    success: true,
    message: 'GST Invoice generated successfully',
    data: {
      invoiceId,
      invoiceNumber,
      placeOfSupply: `${order.customerState} (${order.customerStateCode})`,
      isIntraState,
      taxableAmount: taxableAmount.toNumber(),
      cgst: cgstTotal.toNumber(),
      sgst: sgstTotal.toNumber(),
      igst: igstTotal.toNumber(),
      grandTotal: grandTotal.toNumber(),
      balanceDue: grandTotal.toNumber(),
    },
  });
});

// GET Invoice by ID with detailed GST summary
invoiceRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const invoice = await queryOne(
    `SELECT i.*, c.name as "customerName", c.code as "customerCode", c.gstin as "customerGstin",
            c."billingAddress", c."shippingAddress", c.state as "customerState", c."stateCode" as "customerStateCode"
     FROM "Invoice" i
     JOIN "Customer" c ON i."customerId" = c.id
     WHERE i.id = $1`,
    [req.params.id]
  );

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  const items = await query(
    `SELECT ii.*, p.name as "productName", p.code as "productCode", p."packSize"
     FROM "InvoiceItem" ii
     JOIN "Product" p ON ii."productId" = p.id
     WHERE ii."invoiceId" = $1`,
    [invoice.id]
  );

  res.json({
    success: true,
    data: {
      ...invoice,
      company: config.company,
      items,
    },
  });
});

// GET all Invoices
invoiceRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const invoices = await query(
    `SELECT i.*, c.name as "customerName", c.code as "customerCode", c.state as "customerState"
     FROM "Invoice" i
     JOIN "Customer" c ON i."customerId" = c.id
     ORDER BY i."invoiceDate" DESC, i."createdAt" DESC`
  );
  res.json({ success: true, data: invoices });
});

// GET Invoice PDF download (generated with pdfmake)
invoiceRouter.get('/:id/pdf', async (req: AuthenticatedRequest, res: Response) => {
  const invoice = await queryOne(
    `SELECT i.*, c.name as "customerName", c.gstin as "customerGstin",
            c."billingAddress", c.state as "customerState", c."stateCode" as "customerStateCode"
     FROM "Invoice" i
     JOIN "Customer" c ON i."customerId" = c.id
     WHERE i.id = $1`,
    [req.params.id]
  );

  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  const items = await query(
    `SELECT ii.*, p.name as "productName", p.code as "productCode", p."packSize"
     FROM "InvoiceItem" ii
     JOIN "Product" p ON ii."productId" = p.id
     WHERE ii."invoiceId" = $1`,
    [invoice.id]
  );

  // @ts-expect-error pdfmake/src/printer.js has no bundled .d.ts
  const PdfPrinterModule: any = await import('pdfmake/src/printer.js').catch(() => null);
  const PdfPrinter = PdfPrinterModule?.default || PdfPrinterModule;
  if (!PdfPrinter) {
    return res.status(500).json({ success: false, message: 'PDF printer unavailable' });
  }

  const printer = new PdfPrinter({
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  });

  const docDefinition: any = {
    defaultStyle: { font: 'Helvetica', fontSize: 10 },
    content: [
      { text: 'TAX INVOICE', style: 'header', alignment: 'center' },
      { text: config.company.name, bold: true, fontSize: 13, margin: [0, 6, 0, 2] },
      { text: `GSTIN: ${config.company.gstin} | State: ${config.company.state} (${config.company.stateCode})` },
      { text: config.company.address, margin: [0, 0, 0, 10] },
      {
        columns: [
          [
            { text: 'Billed To:', bold: true },
            { text: invoice.customerName },
            { text: `GSTIN: ${invoice.customerGstin}` },
            { text: `Place of Supply: ${invoice.placeOfSupply}` },
          ],
          [
            { text: `Invoice #: ${invoice.invoiceNumber}`, bold: true, alignment: 'right' },
            { text: `Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}`, alignment: 'right' },
            { text: `Status: ${invoice.status}`, alignment: 'right' },
          ],
        ],
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            ['Product', 'HSN', 'Qty', 'Rate (₹)', 'Total (₹)'],
            ...items.map((it) => [
              `${it.productName} (${it.packSize})`,
              it.hsnCode,
              Number(it.quantity).toString(),
              Number(it.unitPrice).toFixed(2),
              Number(it.totalAmount).toFixed(2),
            ]),
          ],
        },
        margin: [0, 0, 0, 12],
      },
      { text: `Taxable Amount: ₹${Number(invoice.taxableAmount).toFixed(2)}`, alignment: 'right' },
      { text: `CGST (2.5%): ₹${Number(invoice.cgstAmount).toFixed(2)}`, alignment: 'right' },
      { text: `SGST (2.5%): ₹${Number(invoice.sgstAmount).toFixed(2)}`, alignment: 'right' },
      { text: `IGST (5.0%): ₹${Number(invoice.igstAmount).toFixed(2)}`, alignment: 'right' },
      { text: `Grand Total: ₹${Number(invoice.grandTotal).toFixed(2)}`, bold: true, fontSize: 12, alignment: 'right', margin: [0, 4, 0, 0] },
    ],
    styles: {
      header: { fontSize: 16, bold: true },
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];
  pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
  pdfDoc.on('end', () => {
    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber.replace(/\//g, '-')}.pdf"`);
    res.send(buffer);
  });
  pdfDoc.end();
});

// POST Cancel Invoice via Credit Note (preserves immutable invoice history)
invoiceRouter.post('/:id/cancel', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const invoice = await queryOne('SELECT * FROM "Invoice" WHERE id = $1', [req.params.id]);
  if (!invoice) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }
  if (invoice.status === 'CANCELLED') {
    return res.status(400).json({ success: false, message: 'Invoice is already cancelled.' });
  }

  const countRes = await queryOne<{ count: string }>('SELECT count(*) FROM "CreditNote"');
  const seq = (parseInt(countRes?.count || '0', 10) + 1).toString().padStart(4, '0');
  const creditNoteNumber = `CN/2026-27/${seq}`;
  const reason = (req.body?.reason as string) || 'Cancelled via Credit Note';

  await execute(
    `INSERT INTO "CreditNote" (id, "creditNoteNumber", "invoiceId", reason, amount, "issuedDate", "createdAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [randomUUID(), creditNoteNumber, invoice.id, reason, new Decimal(invoice.grandTotal).toFixed(2)]
  );

  await execute('UPDATE "Invoice" SET status = \'CANCELLED\', "balanceDue" = 0.00, "updatedAt" = NOW() WHERE id = $1', [invoice.id]);

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [randomUUID(), req.user?.userId, 'CANCEL', 'Invoice', invoice.id, JSON.stringify({ creditNoteNumber, reason })]
  );

  res.json({ success: true, message: `Invoice cancelled with Credit Note ${creditNoteNumber}`, data: { creditNoteNumber } });
});

