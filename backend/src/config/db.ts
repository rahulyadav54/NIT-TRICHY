import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL || '';
const isLocalPlaceholder = dbUrl.includes('localhost:5432/udyamflow_erp');
const usePostgresPool = Boolean(
  dbUrl && (process.env.VERCEL === '1' || process.env.USE_PG_POOL === 'true' || !isLocalPlaceholder)
);

let pgliteDb: PGlite | null = null;
let pgPool: pg.Pool | null = null;
let bootstrapPromise: Promise<void> | null = null;

if (usePostgresPool) {
  pgPool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
    max: 5,
  });
} else {
  const pgdataDir = path.resolve(process.cwd(), 'prisma', 'pgdata');
  pgliteDb = new PGlite(pgdataDir);
}

export const db = pgliteDb;

async function ensurePostgresBootstrapped(pool: pg.Pool): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const check = await pool.query<{ exists: string | null }>(
          'SELECT to_regclass(\'public."User"\') as exists;'
        );
        if (check.rows[0]?.exists) return;

        // Locate init_utf8.sql relative to cwd or backend/prisma
        const candidates = [
          path.resolve(process.cwd(), 'prisma', 'init_utf8.sql'),
          path.resolve(process.cwd(), 'backend', 'prisma', 'init_utf8.sql'),
        ];
        const sqlPath = candidates.find((p) => fs.existsSync(p));
        if (!sqlPath) {
          console.warn('init_utf8.sql not found; skipping auto-DDL bootstrap.');
          return;
        }

        const sql = fs.readFileSync(sqlPath, 'utf8').replace(/^\uFEFF/, '');
        const stmts = sql
          .split(/;\s*\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);

        for (const stmt of stmts) {
          await pool.query(stmt + ';');
        }

        // Seed 5 core role users so login works immediately on fresh DB
        const passwordHash = await bcrypt.hash('password123', 10);
        const users = [
          { email: 'salesman@trima.com', name: 'Ravi Salesman', role: 'SALESMAN', phone: '+91 98765 00001' },
          { email: 'admin@trima.com', name: 'Priya Admin', role: 'ADMIN', phone: '+91 98765 00002' },
          { email: 'production@trima.com', name: 'Murugan Supervisor', role: 'PRODUCTION_SUPERVISOR', phone: '+91 98765 00003' },
          { email: 'auditor@trima.com', name: 'Anand Auditor', role: 'ACCOUNTANT_AUDITOR', phone: '+91 98765 00004' },
          { email: 'owner@trima.com', name: 'Sundaram Owner', role: 'OWNER', phone: '+91 98765 00005' },
        ];
        for (const u of users) {
          await pool.query(
            'INSERT INTO "User" (id, email, "passwordHash", name, role, phone, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW()) ON CONFLICT (email) DO NOTHING',
            [randomUUID(), u.email, passwordHash, u.name, u.role, u.phone]
          );
        }
        console.log('✅ Auto-bootstrapped PostgreSQL schema & 5 core roles.');
      } catch (err) {
        console.error('PostgreSQL auto-bootstrap warning:', err);
      }
    })();
  }
  return bootstrapPromise;
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (pgPool) {
    await ensurePostgresBootstrapped(pgPool);
    const result = await pgPool.query(sql, params);
    return result.rows as T[];
  }
  const result = await pgliteDb!.query<T>(sql, params);
  return result.rows;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  if (pgPool) {
    await ensurePostgresBootstrapped(pgPool);
    await pgPool.query(sql, params);
    return;
  }
  await pgliteDb!.query(sql, params);
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
