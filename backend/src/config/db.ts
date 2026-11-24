import { PGlite } from '@electric-sql/pglite';
import path from 'path';

const pgdataDir = path.resolve(process.cwd(), 'prisma', 'pgdata');
export const db = new PGlite(pgdataDir);

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const result = await db.query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await db.query(sql, params);
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const res = await query('SELECT 1 as test');
    return res.length > 0;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}
