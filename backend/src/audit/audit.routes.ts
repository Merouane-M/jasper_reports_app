import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin } from '../common/middleware/auth.middleware';
import { query } from '../db';

const router = Router();

// ─── Build filters from query params ─────────────
function buildWhereClause(params: Record<string, string>) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (params.from) {
    conditions.push(`al.created_at >= $${i++}`);
    values.push(params.from);
  }
  if (params.to) {
    conditions.push(`al.created_at <= $${i++}`);
    values.push(params.to);
  }
  if (params.adminUserId) {
    conditions.push(`al.admin_user_id = $${i++}`);
    values.push(params.adminUserId);
  }
  if (params.actionType) {
    conditions.push(`al.action_type = $${i++}`);
    values.push(params.actionType);
  }
  if (params.entityType) {
    conditions.push(`al.entity_type = $${i++}`);
    values.push(params.entityType);
  }
  if (params.search) {
    conditions.push(`(
      al.action_type LIKE $${i} OR
      al.entity_type LIKE $${i} OR
      u.email LIKE $${i}
    )`);
    values.push(`%${params.search}%`);
    i++;
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

// ─── GET /api/audit — paginated list ─────────────
router.get('/', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const page   = Math.max(1, Number(req.query.page)  || 1);
  const limit  = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const { where, values } = buildWhereClause(req.query as Record<string, string>);

  try {
    const countResult = await query(
      `SELECT COUNT(*) FROM audit_logs al
       LEFT JOIN users u ON u.id = al.admin_user_id
       ${where}`,
      values
    );
    const total = Number(countResult.rows[0].count);

    const { rows } = await query(
      `SELECT al.*,
              u.email AS admin_email,
              u.first_name + ' ' + u.last_name AS admin_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.admin_user_id
       ${where}
       ORDER BY al.created_at DESC
       OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`,
      values
    );

    res.json({
      data: rows,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ─── GET /api/audit/export — CSV / XLSX / JSON ───
router.get('/export', authenticate, requireAdmin, async (req: Request, res: Response) => {
  const format = (req.query.format as string) ?? 'csv';
  const { where, values } = buildWhereClause(req.query as Record<string, string>);

  try {
    const { rows } = await query(
      `SELECT
         al.id, al.created_at, al.action_type, al.entity_type,
         al.entity_id, al.ip_address,
         u.email AS admin_email,
         u.first_name + ' ' + u.last_name AS admin_name,
         al.before_snapshot, al.after_snapshot, al.user_agent
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.admin_user_id
       ${where}
       ORDER BY al.created_at DESC`,
      values
    );

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.json"');
      res.json(rows);
      return;
    }

    if (format === 'csv') {
      const headers = ['id','created_at','action_type','entity_type','entity_id',
                       'admin_email','admin_name','ip_address'];
      const csv = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(h => {
            const v = String(row[h] ?? '').replace(/"/g, '""');
            return `"${v}"`;
          }).join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
      res.send(csv);
      return;
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Audit Logs');

      sheet.columns = [
        { header: 'ID',          key: 'id',          width: 38 },
        { header: 'Timestamp',   key: 'created_at',  width: 24 },
        { header: 'Action',      key: 'action_type', width: 25 },
        { header: 'Entity Type', key: 'entity_type', width: 16 },
        { header: 'Entity ID',   key: 'entity_id',   width: 38 },
        { header: 'Admin Email', key: 'admin_email', width: 30 },
        { header: 'Admin Name',  key: 'admin_name',  width: 22 },
        { header: 'IP Address',  key: 'ip_address',  width: 18 },
      ];

      // Style header row
      sheet.getRow(1).eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E4FD' } };
      });

      rows.forEach(row => sheet.addRow(row));

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.xlsx"');
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    res.status(400).json({ error: 'Invalid format. Use csv, xlsx, or json.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

// ─── GET /api/audit/meta — distinct action/entity types ──
router.get('/meta', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  const [actionTypes, entityTypes] = await Promise.all([
    query('SELECT DISTINCT action_type FROM audit_logs ORDER BY action_type'),
    query('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type'),
  ]);
  res.json({
    actionTypes: actionTypes.rows.map(r => r.action_type),
    entityTypes: entityTypes.rows.map(r => r.entity_type),
  });
});

export default router;
