import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../common/middleware/auth.middleware';
import { auditMiddleware } from '../common/middleware/audit.middleware';
import { query } from '../db';

const router = Router();

// List all users (admin only)
router.get('/', authenticate, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name,
              u.is_active, u.created_at, r.name AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (admin only)
router.put('/:id/role', authenticate, auditMiddleware, requireAdmin, [
  body('role').isIn(['admin', 'user']),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }

  try {
    const { rows: roles } = await query(
      'SELECT id FROM roles WHERE name = $1',
      [req.body.role]
    );
    if (!roles.length) { res.status(400).json({ error: 'Invalid role' }); return; }

    const { rows } = await query(
      `UPDATE users SET role_id = $1, updated_at = GETUTCDATE()
       WHERE id = $2 RETURNING id, email, first_name, last_name`,
      [roles[0].id, req.params.id]
    );
    if (!rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error('[Update Role] Error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Toggle user active status (admin only)
router.patch('/:id/toggle', authenticate, auditMiddleware, requireAdmin, async (req: Request, res: Response) => {
  // Prevent admin from deactivating themselves
  if (req.params.id === req.user!.userId) {
    res.status(400).json({ error: 'Cannot deactivate yourself' });
    return;
  }
  try {
    const { rows } = await query(
      `UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = GETUTCDATE()
       WHERE id = $1 RETURNING id, email, is_active`,
      [req.params.id]
    );
    if (!rows.length) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(rows[0]);
  } catch (err) {
    console.error('[Toggle Active] Error:', err);
    res.status(500).json({ error: 'Failed to toggle user' });
  }
});

// Get user's report access
router.get('/:id/access', authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rows } = await query(
      `SELECT r.id, r.name, r.description, ura.granted_at
       FROM user_report_access ura
       JOIN reports r ON r.id = ura.report_id
       WHERE ura.user_id = $1 AND r.deleted_at IS NULL`,
      [req.params.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch access' });
  }
});

export default router;
