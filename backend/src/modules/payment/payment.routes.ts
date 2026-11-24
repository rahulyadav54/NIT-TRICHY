import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../../config/db.js';
import { authGuard, roleGuard, AuthenticatedRequest } from '../../middleware/auth.js';
import { Role } from '@prisma/client';
import Decimal from 'decimal.js';
import { randomUUID } from 'crypto';

export const paymentRouter = Router();
paymentRouter.use(authGuard);

const recordPaymentSchema = z.object({
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().optional().nullable(),
  amount: z.number().positive(),
  paymentMode: z.enum(['CASH', 'NEFT', 'RTGS', 'CHEQUE', 'UPI']),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// POST Record Customer Payment (Updates invoice balance due, prevents overpayment)
paymentRouter.post('/', roleGuard([Role.ADMIN, Role.OWNER]), async (req: AuthenticatedRequest, res: Response) => {
  const parsed = recordPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.errors });
  }

  const d = parsed.data;
  const paymentAmount = new Decimal(d.amount);

  let newInvoiceBalance = new Decimal(0);
  if (d.invoiceId) {
    const invoice = await queryOne('SELECT * FROM "Invoice" WHERE id = $1', [d.invoiceId]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const currentBalanceDue = new Decimal(invoice.balanceDue);

    // Overpayment prevention rule
    if (paymentAmount.greaterThan(currentBalanceDue)) {
      return res.status(400).json({
        success: false,
        message: `Overpayment blocked: Payment of ₹${paymentAmount} exceeds invoice balance due of ₹${currentBalanceDue}.`,
      });
    }

    newInvoiceBalance = currentBalanceDue.minus(paymentAmount);
    const newStatus = newInvoiceBalance.isZero() ? 'PAID' : 'PARTIALLY_PAID';

    await execute(
      'UPDATE "Invoice" SET "balanceDue" = $1, status = $2, "updatedAt" = NOW() WHERE id = $3',
      [newInvoiceBalance.toFixed(2), newStatus, invoice.id]
    );
  }

  const paymentId = randomUUID();
  const paymentCount = await queryOne<{ count: string }>('SELECT count(*) FROM "Payment"');
  const seq = (parseInt(paymentCount?.count || '0', 10) + 1).toString().padStart(4, '0');
  const paymentNumber = `PAY/2026-27/${seq}`;

  await execute(
    `INSERT INTO "Payment" (id, "paymentNumber", "customerId", "invoiceId", amount, "paymentMode", "referenceNumber", notes, "paymentDate", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [
      paymentId,
      paymentNumber,
      d.customerId,
      d.invoiceId || null,
      paymentAmount.toFixed(2),
      d.paymentMode,
      d.referenceNumber || null,
      d.notes || null,
    ]
  );

  await execute(
    'INSERT INTO "AuditLog" (id, "userId", action, "entityName", "entityId", "newValues", timestamp) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
    [
      randomUUID(),
      req.user?.userId,
      'CREATE',
      'Payment',
      paymentId,
      JSON.stringify({ paymentNumber, amount: paymentAmount.toNumber(), remainingBalance: newInvoiceBalance.toNumber() }),
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: {
      paymentId,
      paymentNumber,
      amount: paymentAmount.toNumber(),
      remainingInvoiceBalance: newInvoiceBalance.toNumber(),
    },
  });
});

// GET Outstanding Receivables Customer-wise and Invoice-wise
paymentRouter.get('/outstanding', async (req: AuthenticatedRequest, res: Response) => {
  const customerId = req.query.customerId as string;
  let sql = `
    SELECT i.id as "invoiceId", i."invoiceNumber", i."invoiceDate", i."grandTotal", i."balanceDue",
           i.status, c.id as "customerId", c.name as "customerName", c.code as "customerCode"
    FROM "Invoice" i
    JOIN "Customer" c ON i."customerId" = c.id
    WHERE i."balanceDue" > 0 AND i.status != 'CANCELLED'
  `;
  const params: any[] = [];
  if (customerId) {
    sql += ' AND i."customerId" = $1';
    params.push(customerId);
  }
  sql += ' ORDER BY i."invoiceDate" ASC';

  const outstandingInvoices = await query(sql, params);
  const totalOutstanding = outstandingInvoices.reduce(
    (acc, row) => acc.plus(new Decimal(row.balanceDue)),
    new Decimal(0)
  );

  res.json({
    success: true,
    totalOutstanding: totalOutstanding.toNumber(),
    data: outstandingInvoices,
  });
});

