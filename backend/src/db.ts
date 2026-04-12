import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
  server:   process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME     || 'jasper_reports',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt:                process.env.DB_ENCRYPT    === 'true',  // true for Azure
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false', // true for local dev
    enableArithAbort: true,
  },
  pool: {
    max:               10,
    min:               0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool(config).connect();
    pool.on('error', err => {
      console.error('[DB] Pool error:', err);
      pool = null;
    });
  }
  return pool;
}

// Drop-in replacement for the pg query() helper — returns { rows: T[] }
// so the rest of the codebase stays unchanged.
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[] }> {
  const p = await getPool();
  const request = p.request();

  // Translate PostgreSQL positional params ($1, $2 …) → MSSQL named params (@p1, @p2 …)
  let mssqlText = text.replace(/\$(\d+)/g, (_match, n) => {
    const paramName = `p${n}`;
    request.input(paramName, params[Number(n) - 1] ?? null);
    return `@${paramName}`;
  });

  // Translate PostgreSQL functions to SQL Server equivalents
  mssqlText = mssqlText.replace(/NOW\(\)/gi, 'GETUTCDATE()'); // NOW() → GETUTCDATE()
  // NOT bool_col → bit toggle (but NOT NULL, NOT EXISTS, etc. should remain unchanged)
  mssqlText = mssqlText.replace(/NOT\s+([a-z_][a-z0-9_\.]*)\s*=/gi, 'CASE WHEN $1 = 1 THEN 0 ELSE 1 END =');
  mssqlText = mssqlText.replace(/\s+\|\|\s+/g, ' + '); // || → + for string concatenation

  // Remove ON CONFLICT clause (not needed for create-admin, but handle it)
  mssqlText = mssqlText.replace(/\s+ON\s+CONFLICT[^R]*(?=RETURNING|$)/gi, ' ');

  // Translate PostgreSQL RETURNING clause to SQL Server OUTPUT clause
  mssqlText = mssqlText.replace(
    /RETURNING\s+(.+?)(?=\s*$|;)/i,
    (_match, cols) => {
      const columns = cols
        .split(',')
        .map((col: string) => {
          const trimmed = col.trim();
          return trimmed === '*' ? 'inserted.*' : `inserted.${trimmed}`;
        })
        .join(', ');
      return `OUTPUT ${columns}`;
    }
  );

  // For INSERT statements: move OUTPUT before VALUES clause
  // Pattern: INSERT INTO table (cols) VALUES (...) OUTPUT ... 
  // Goal: INSERT INTO table (cols) OUTPUT ... VALUES (...)
  mssqlText = mssqlText.replace(
    /(INSERT\s+INTO\s+[\w\[\]]+\s*\([^)]+\))\s+VALUES\s+(\([^)]+\))\s+OUTPUT\s+(.+?)(?=\s*$|;)/i,
    '$1 OUTPUT $3 VALUES $2'
  );

  // For UPDATE and DELETE statements: move OUTPUT before WHERE clause
  // Match: (everything before WHERE) WHERE (condition) OUTPUT (columns)
  // The condition part should be everything between WHERE and OUTPUT
  const updateWhereOutputMatch = mssqlText.match(/^(.+?\s+WHERE\s+)(.+?)(\s+OUTPUT\s+.+?)$/i);
  if (updateWhereOutputMatch) {
    // Reconstruct: everything_before_WHERE OUTPUT columns WHERE condition
    const beforeWhere = updateWhereOutputMatch[1].replace(/\s+WHERE\s+$/i, '');
    const condition = updateWhereOutputMatch[2];
    const output = updateWhereOutputMatch[3];
    mssqlText = beforeWhere + output + ' WHERE ' + condition;
  }

  console.log('[db.query] Final SQL:', mssqlText.substring(0, 200) + (mssqlText.length > 200 ? '...' : ''));
  const result = await request.query(mssqlText);
  return { rows: result.recordset as T[] };
}
