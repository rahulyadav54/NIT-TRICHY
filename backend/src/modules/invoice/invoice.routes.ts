import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';
import { config } from '../../config/env.js';
import { InventoryLedgerService } from '../inventory/inventoryLedger.service.js';
// @ts-expect-error pdfmake/src/printer.js has no bundled .d.ts
import PdfPrinter from 'pdfmake/src/printer.js';

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

  const printer = new PdfPrinter({
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique',
    },
  });

  const isInterState = Number(invoice.igstAmount || 0) > 0;
  const docDefinition: any = {
    pageSize: 'A4',
    pageMargins: [36, 36, 36, 48],
    defaultStyle: { font: 'Helvetica', fontSize: 9.5, color: '#172033' },
    content: [
      // Top Navy Banner
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [
              {
                stack: [
                  { text: config.company.name.toUpperCase(), fontSize: 15, bold: true, color: '#FFFFFF' },
                  { text: config.company.address, fontSize: 8.5, color: '#CBD5E1', margin: [0, 3, 0, 2] },
                  { text: `GSTIN: ${config.company.gstin}  |  State: ${config.company.state} (${config.company.stateCode})  |  ${config.company.phone}`, fontSize: 8.5, color: '#93C5FD' },
                ],
                fillColor: '#101B33',
                margin: [14, 12, 10, 12],
                border: [false, false, false, false],
              },
              {
                stack: [
                  { text: 'TAX INVOICE', fontSize: 16, bold: true, color: '#FFFFFF', alignment: 'right' },
                  { text: 'Original for Recipient', fontSize: 8, color: '#94A3B8', alignment: 'right', margin: [0, 3, 0, 0] },
                ],
                fillColor: '#101B33',
                margin: [10, 14, 14, 12],
                border: [false, false, false, false],
              },
            ],
          ],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 14],
      },
      // Customer & Invoice Metadata Cards
      {
        table: {
          widths: ['55%', '45%'],
          body: [
            [
              {
                stack: [
                  { text: 'BILLED TO', fontSize: 8, bold: true, color: '#2457D6', margin: [0, 0, 0, 4] },
                  { text: invoice.customerName, fontSize: 11, bold: true, color: '#172033' },
                  { text: invoice.billingAddress || invoice.customerState || '', fontSize: 8.5, color: '#64748B', margin: [0, 2, 0, 3] },
                  { text: `GSTIN: ${invoice.customerGstin || 'N/A'}`, fontSize: 8.5, bold: true },
                  { text: `Place of Supply: ${invoice.placeOfSupply}`, fontSize: 8.5, color: '#475569', margin: [0, 2, 0, 0] },
                ],
                fillColor: '#F4F7FB',
                margin: [10, 10, 10, 10],
              },
              {
                stack: [
                  { text: 'INVOICE DETAILS', fontSize: 8, bold: true, color: '#2457D6', margin: [0, 0, 0, 4] },
                  { text: `Invoice No: ${invoice.invoiceNumber}`, fontSize: 10.5, bold: true, color: '#172033' },
                  { text: `Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, fontSize: 8.5, margin: [0, 3, 0, 2] },
                  { text: `Supply Type: ${isInterState ? 'Inter-State (IGST 5%)' : 'Intra-State (CGST 2.5% + SGST 2.5%)'}`, fontSize: 8.5, color: '#0D9488', bold: true },
                  { text: `Status: ${invoice.status}`, fontSize: 8.5, bold: true, color: invoice.status === 'PAID' ? '#0D9488' : '#2457D6', margin: [0, 2, 0, 0] },
                ],
                fillColor: '#F4F7FB',
                margin: [10, 10, 10, 10],
              },
            ],
          ],
        },
        layout: {
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
        },
        margin: [0, 0, 0, 14],
      },
      // Line Items Table
      {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: '#', bold: true, color: '#FFFFFF', fillColor: '#101B33', margin: [6, 7, 6, 7] },
              { text: 'Description & Pack Size', bold: true, color: '#FFFFFF', fillColor: '#101B33', margin: [6, 7, 6, 7] },
              { text: 'HSN', bold: true, color: '#FFFFFF', fillColor: '#101B33', alignment: 'center', margin: [6, 7, 6, 7] },
              { text: 'Qty', bold: true, color: '#FFFFFF', fillColor: '#101B33', alignment: 'right', margin: [6, 7, 6, 7] },
              { text: 'Rate (₹)', bold: true, color: '#FFFFFF', fillColor: '#101B33', alignment: 'right', margin: [6, 7, 6, 7] },
              { text: 'Taxable (₹)', bold: true, color: '#FFFFFF', fillColor: '#101B33', alignment: 'right', margin: [6, 7, 6, 7] },
              { text: 'Total (₹)', bold: true, color: '#FFFFFF', fillColor: '#101B33', alignment: 'right', margin: [6, 7, 6, 7] },
            ],
            ...items.map((it, idx) => {
              const bg = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
              return [
                { text: `${idx + 1}`, fillColor: bg, margin: [6, 6, 6, 6] },
                { text: `${it.productName} (${it.packSize})`, bold: true, fillColor: bg, margin: [6, 6, 6, 6] },
                { text: it.hsnCode, alignment: 'center', fillColor: bg, color: '#475569', margin: [6, 6, 6, 6] },
                { text: `${Number(it.quantity)} pkts`, alignment: 'right', fillColor: bg, margin: [6, 6, 6, 6] },
                { text: Number(it.unitPrice).toFixed(2), alignment: 'right', fillColor: bg, margin: [6, 6, 6, 6] },
                { text: Number(it.taxableAmount).toFixed(2), alignment: 'right', fillColor: bg, margin: [6, 6, 6, 6] },
                { text: Number(it.totalAmount).toFixed(2), bold: true, alignment: 'right', fillColor: bg, margin: [6, 6, 6, 6] },
              ];
            }),
          ],
        },
        layout: {
          hLineColor: () => '#E2E8F0',
          vLineColor: () => '#E2E8F0',
        },
        margin: [0, 0, 0, 14],
      },
      // Summary & Tax Box
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: 'Terms & Statutory Declaration', bold: true, fontSize: 9, color: '#101B33', margin: [0, 0, 0, 4] },
              { text: '1. Goods once sold will not be taken back unless damaged in transit.\n2. Subject to Tiruchirappalli Jurisdiction.\n3. Certified that particulars given above are true and correct under GST Act.', fontSize: 8, color: '#64748B', lineHeight: 1.35 },
            ],
          },
          {
            width: 220,
            table: {
              widths: ['*', 'auto'],
              body: [
                [{ text: 'Taxable Value', color: '#475569', margin: [8, 5, 6, 5] }, { text: `₹${Number(invoice.taxableAmount).toFixed(2)}`, alignment: 'right', margin: [6, 5, 8, 5] }],
                [{ text: 'CGST (2.5%)', color: '#475569', margin: [8, 4, 6, 4] }, { text: `₹${Number(invoice.cgstAmount).toFixed(2)}`, alignment: 'right', margin: [6, 4, 8, 4] }],
                [{ text: 'SGST (2.5%)', color: '#475569', margin: [8, 4, 6, 4] }, { text: `₹${Number(invoice.sgstAmount).toFixed(2)}`, alignment: 'right', margin: [6, 4, 8, 4] }],
                [{ text: 'IGST (5.0%)', color: '#475569', margin: [8, 4, 6, 4] }, { text: `₹${Number(invoice.igstAmount).toFixed(2)}`, alignment: 'right', margin: [6, 4, 8, 4] }],
                [{ text: 'GRAND TOTAL', bold: true, color: '#FFFFFF', fillColor: '#2457D6', margin: [8, 7, 6, 7] }, { text: `₹${Number(invoice.grandTotal).toFixed(2)}`, bold: true, fontSize: 11, color: '#FFFFFF', fillColor: '#2457D6', alignment: 'right', margin: [6, 7, 8, 7] }],
                [{ text: 'Balance Due', bold: true, color: '#172033', fillColor: '#F4F7FB', margin: [8, 5, 6, 5] }, { text: `₹${Number(invoice.balanceDue ?? invoice.grandTotal).toFixed(2)}`, bold: true, color: Number(invoice.balanceDue) > 0 ? '#DC2626' : '#0D9488', fillColor: '#F4F7FB', alignment: 'right', margin: [6, 5, 8, 5] }],
              ],
            },
            layout: {
              hLineColor: () => '#E2E8F0',
              vLineColor: () => '#E2E8F0',
            },
          },
        ],
        margin: [0, 0, 0, 24],
      },
      // Authorized Signatory
      {
        columns: [
          { text: 'TRIMA ERP — Trichy Integrated Manufacturing & Audit', fontSize: 8, color: '#94A3B8', margin: [0, 20, 0, 0] },
          {
            stack: [
              { text: `For ${config.company.name}`, bold: true, fontSize: 9, alignment: 'right' },
              { text: 'Authorized Signatory', fontSize: 8, color: '#64748B', alignment: 'right', margin: [0, 24, 0, 0] },
            ],
          },
        ],
      },
    ],
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

