import { query, execute } from '../src/config/db.js';
import { seedMasterData } from './seed.js';

export async function resetAndSeedBenchmark() {
  console.log('🔄 Performing Clean Database Reset & Benchmark Re-seeding...');

  // Delete transaction records in reverse dependency order
  const tables = [
    'AuditLog',
    'Payment',
    'CreditNote',
    'DispatchItem',
    'Dispatch',
    'InvoiceItem',
    'Invoice',
    'SalesOrderItem',
    'SalesOrder',
    'ProductionConsumption',
    'ProductionRun',
    'PurchaseItem',
    'Purchase',
    'InventoryMovement',
    'BOMItem',
    'BOM',
    'ProductPrice',
    'Product',
    'Material',
    'Supplier',
    'Customer',
    'User',
  ];

  for (const table of tables) {
    try {
      await execute(`DELETE FROM "${table}"`);
    } catch (e: any) {
      console.warn(`Warning clearing ${table}:`, e.message);
    }
  }

  // Reseed master data
  await seedMasterData();
  console.log('✅ Clean Benchmark Database Reset Complete.');
}

if (process.argv[1]?.includes('reset')) {
  resetAndSeedBenchmark().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}

