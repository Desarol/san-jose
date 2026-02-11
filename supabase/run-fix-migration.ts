import postgres from 'postgres';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, {
  ssl: 'require',
  max: 1,
});

async function runMigration() {
  const migrationPath = resolve(__dirname, 'migrations/002_fix_rls_recursion.sql');
  const migration = readFileSync(migrationPath, 'utf-8');

  console.log('Running RLS fix migration...');

  try {
    await sql.unsafe(migration);
    console.log('RLS fix migration completed successfully!');
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error('Migration error:', error.message || error);
    throw err;
  } finally {
    await sql.end();
  }
}

runMigration().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
