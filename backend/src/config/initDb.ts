import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase() {
  const pgdataDir = path.resolve(process.cwd(), 'prisma', 'pgdata');
  const ddlPath = path.resolve(process.cwd(), 'prisma', 'init.sql');

  const pglite = new PGlite(pgdataDir);
  const sql = fs.readFileSync(ddlPath, 'utf8');

  try {
    // Check if tables already exist
    const check = await pglite.query<{ exists: string | null }>("SELECT to_regclass('public.\"User\"') as exists;");
    if (!check.rows[0] || !check.rows[0].exists) {
      console.log('🔄 Initializing fresh PostgreSQL tables in PGlite storage...');
      await pglite.exec(sql);
      console.log('✅ PostgreSQL schema successfully applied to PGlite storage.');
    } else {
      console.log('✅ PostgreSQL schema already exists in PGlite storage.');
    }
  } catch (error) {
    console.error('Error applying schema to PGlite:', error);
  } finally {
    await pglite.close();
  }
}

if (process.argv[1]?.includes('initDb')) {
  initializeDatabase().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
