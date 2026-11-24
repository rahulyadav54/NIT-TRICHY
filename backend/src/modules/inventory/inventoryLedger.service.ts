import Decimal from 'decimal.js';
import { query, queryOne, execute } from '../../config/db.js';
import { randomUUID } from 'crypto';

export type MovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE_RECEIPT'
  | 'PRODUCTION_ISSUE'
  | 'PRODUCTION_RECEIPT'
  | 'SALES_DISPATCH'
  | 'RETURN'
  | 'ADJUSTMENT';

export type InventoryCategory = 'RAW_MATERIAL' | 'PACKAGING' | 'FINISHED_GOODS';

export interface MovementInput {
  materialId?: string | null;
  productId?: string | null;
  category: InventoryCategory;
  transactionType: MovementType;
  qtyIn?: number | string | Decimal;
  qtyOut?: number | string | Decimal;
  unit: string;
  sourceDocumentType: 'OPENING' | 'PURCHASE' | 'PRODUCTION_RUN' | 'DISPATCH' | 'ADJUSTMENT';
  sourceDocumentId: string;
  performedByUserId?: string | null;
  notes?: string | null;
  allowNegative?: boolean;
}

export class InventoryLedgerService {
  /**
   * Get current stock balance derived strictly from immutable movements
   */
  static async getCurrentStock(itemId: string, isProduct = false): Promise<Decimal> {
    const col = isProduct ? '"productId"' : '"materialId"';
    const res = await queryOne<{ balance: string }>(
      `SELECT COALESCE(SUM("qtyIn") - SUM("qtyOut"), 0) as balance FROM "InventoryMovement" WHERE ${col} = $1`,
      [itemId]
    );
    return new Decimal(res?.balance || '0');
  }

  /**
   * Record an atomic inventory ledger entry with balance tracking and negative stock prevention
   */
  static async recordMovement(input: MovementInput): Promise<{ id: string; balanceAfter: Decimal }> {
    const itemId = input.productId || input.materialId;
    if (!itemId) {
      throw new Error('Either materialId or productId must be provided for inventory movement.');
    }

    const currentBalance = await this.getCurrentStock(itemId, !!input.productId);
    const qtyIn = new Decimal(input.qtyIn || 0);
    const qtyOut = new Decimal(input.qtyOut || 0);

    const newBalance = currentBalance.plus(qtyIn).minus(qtyOut);

    // Negative stock prevention rule
    if (newBalance.isNegative() && !input.allowNegative) {
      throw new Error(
        `Insufficient inventory: Attempted to deduct ${qtyOut.toString()} ${input.unit}, but available stock is ${currentBalance.toString()} ${input.unit}.`
      );
    }

    const movementId = randomUUID();

    await execute(
      `INSERT INTO "InventoryMovement" (
        id, "materialId", "productId", category, "transactionType", "qtyIn", "qtyOut", "balanceAfter", unit,
        "sourceDocumentType", "sourceDocumentId", "performedByUserId", notes, "transactionDate", "createdAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
      [
        movementId,
        input.materialId || null,
        input.productId || null,
        input.category,
        input.transactionType,
        qtyIn.toFixed(4),
        qtyOut.toFixed(4),
        newBalance.toFixed(4),
        input.unit,
        input.sourceDocumentType,
        input.sourceDocumentId,
        input.performedByUserId || null,
        input.notes || null,
      ]
    );

    return { id: movementId, balanceAfter: newBalance };
  }
}
