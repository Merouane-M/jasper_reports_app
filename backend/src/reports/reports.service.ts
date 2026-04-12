import { query } from '../db';

export interface CreateReportDto {
  name: string;
  description?: string;
  jasperUrl: string;
  httpMethod?: string;
  isPublic?: boolean;
}

export interface ReportParameter {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  required: boolean;
  defaultValue?: string;
  options?: { label: string; value: string }[];
  sortOrder?: number;
}

export async function listReports(userId: string, role: string) {
  if (role === 'admin') {
    const { rows } = await query(
      `SELECT r.*, (ISNULL(u.first_name, '') + ' ' + ISNULL(u.last_name, '')) AS created_by_name
       FROM reports r LEFT JOIN users u ON u.id = r.created_by
       WHERE r.deleted_at IS NULL
       ORDER BY r.created_at DESC`
    );
    return rows;
  }
  // Regular users: public reports + explicitly granted ones
  try {
    const { rows } = await query(
      `SELECT DISTINCT r.*
       FROM reports r
       LEFT JOIN user_report_access ura ON ura.report_id = r.id AND ura.user_id = $1
       WHERE r.deleted_at IS NULL
         AND r.is_active = 1
         AND (r.is_public = 1 OR ura.user_id IS NOT NULL)
       ORDER BY r.name`,
      [userId]
    );
    return rows;
  } catch (err) {
    console.error('[listReports] User query error:', err);
    throw err;
  }
}

export async function getReport(id: string) {
  const { rows } = await query(
    `SELECT r.*
     FROM reports r
     WHERE r.id = $1 AND r.deleted_at IS NULL`,
    [id]
  );
  
  if (!rows.length) return null;
  
  // Fetch parameters separately (SQL Server doesn't have json_agg)
  const { rows: parameters } = await query(
    `SELECT id, name, label, type, required, default_value, options, sort_order
     FROM report_parameters
     WHERE report_id = $1
     ORDER BY sort_order`,
    [id]
  );
  
  return {
    ...rows[0],
    parameters: parameters.map(p => ({
      id: p.id,
      name: p.name,
      label: p.label,
      type: p.type,
      required: p.required,
      defaultValue: p.default_value,
      options: p.options,
      sortOrder: p.sort_order,
    })),
  };
}

export async function createReport(dto: CreateReportDto, userId: string) {
  const { rows } = await query(
    `INSERT INTO reports (name, description, jasper_url, http_method, is_public, created_by)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [dto.name, dto.description, dto.jasperUrl, dto.httpMethod ?? 'GET', dto.isPublic ?? false, userId]
  );
  return rows[0];
}

export async function updateReport(id: string, dto: Partial<CreateReportDto>) {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (dto.name !== undefined)        { fields.push(`name = $${paramIndex}`);        values.push(dto.name); paramIndex++; }
  if (dto.description !== undefined) { fields.push(`description = $${paramIndex}`); values.push(dto.description); paramIndex++; }
  if (dto.jasperUrl !== undefined)   { fields.push(`jasper_url = $${paramIndex}`);  values.push(dto.jasperUrl); paramIndex++; }
  if (dto.httpMethod !== undefined)  { fields.push(`http_method = $${paramIndex}`); values.push(dto.httpMethod); paramIndex++; }
  if (dto.isPublic !== undefined)    { fields.push(`is_public = $${paramIndex}`);   values.push(dto.isPublic); paramIndex++; }

  if (!fields.length) throw new Error('Nothing to update');
  
  fields.push(`updated_at = GETUTCDATE()`);
  values.push(id);

  const { rows } = await query(
    `UPDATE reports SET ${fields.join(', ')} WHERE id = $${paramIndex} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function softDeleteReport(id: string) {
  const { rows } = await query(
    `UPDATE reports SET deleted_at = GETUTCDATE() WHERE id = $1 RETURNING id`,
    [id]
  );
  return rows[0] ?? null;
}

export async function toggleVisibility(id: string) {
  const { rows } = await query(
    `UPDATE reports SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = GETUTCDATE()
     WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
    [id]
  );
  return rows[0] ?? null;
}

export async function setParameters(reportId: string, params: ReportParameter[]) {
  await query('DELETE FROM report_parameters WHERE report_id = $1', [reportId]);
  for (const p of params) {
    await query(
      `INSERT INTO report_parameters
         (report_id, name, label, type, required, default_value, options, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        reportId, p.name, p.label, p.type, p.required,
        p.defaultValue ?? null,
        typeof p.options === 'string' ? p.options : (p.options ? JSON.stringify(p.options) : null),
        p.sortOrder ?? 0,
      ]
    );
  }
  return getReport(reportId);
}

export async function grantAccess(reportId: string, userId: string, grantedBy: string) {
  // Check if access already exists
  const { rows: existing } = await query(
    `SELECT * FROM user_report_access WHERE report_id = $1 AND user_id = $2`,
    [reportId, userId]
  );
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const { rows } = await query(
    `INSERT INTO user_report_access (report_id, user_id, granted_by)
     VALUES ($1,$2,$3)`,
    [reportId, userId, grantedBy]
  );
  return rows[0];
}

export async function revokeAccess(reportId: string, userId: string) {
  await query(
    'DELETE FROM user_report_access WHERE report_id = $1 AND user_id = $2',
    [reportId, userId]
  );
}
