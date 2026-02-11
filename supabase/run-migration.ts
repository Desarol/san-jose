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
  const migrationPath = resolve(__dirname, 'migrations/001_initial_schema.sql');
  const migration = readFileSync(migrationPath, 'utf-8');

  // Split by semicolons but respect dollar-quoted strings
  // We'll run the whole thing as a single query using unsafe
  console.log('Running migration...');

  try {
    await sql.unsafe(migration);
    console.log('Migration completed successfully!');
  } catch (err: unknown) {
    const error = err as { message?: string };
    // Some errors are OK (like "already exists")
    if (error.message?.includes('already exists')) {
      console.log('Some objects already exist, continuing...');
    } else {
      console.error('Migration error:', error);
      throw err;
    }
  } finally {
    await sql.end();
  }
}

runMigration().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
