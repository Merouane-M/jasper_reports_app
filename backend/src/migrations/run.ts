import fs from 'fs';
import path from 'path';
import { getPool, query } from '../db';

async function runMigrations() {
  try {
    const pool = await getPool();

    // Ensure migrations table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'migrations')
      CREATE TABLE migrations (
        id       INT IDENTITY(1,1) PRIMARY KEY,
        filename NVARCHAR(255) NOT NULL UNIQUE,
        run_at   DATETIME2     NOT NULL DEFAULT GETUTCDATE()
      )
    `);

    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) {
        console.log(`⏭  Skipping ${file} (already run)`);
        continue;
      }

      const sqlText = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      // MSSQL doesn't allow DDL inside a user transaction started by the driver,
      // so execute the entire script directly on the pool request.
      await pool.request().query(sqlText);
      await query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [file]
      );
      console.log(`✅ Ran migration: ${file}`);
    }
    console.log('✔  All migrations complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
