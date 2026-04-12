import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../common/middleware/auth.middleware';
import { auditMiddleware } from '../common/middleware/audit.middleware';
import * as reportsService from './reports.service';

const router = Router();

// List reports (filtered by role/access)
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const reports = await reportsService.listReports(req.user!.userId, req.user!.role);
    res.json(reports);
  } catch (err) {
    console.error('[List Reports] Error:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get single report with parameters
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const report = await reportsService.getReport(req.params.id);
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json(report);
  } catch {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Create report (admin only)
router.post('/', authenticate, auditMiddleware, requireAdmin, [
  body('name').trim().notEmpty(),
  body('jasperUrl').trim().notEmpty(),
  body('httpMethod').optional().isIn(['GET', 'POST']),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
  try {
    const report = await reportsService.createReport(req.body, req.user!.userId);
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Update report (admin only)
router.put('/:id', authenticate, auditMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await reportsService.updateReport(req.params.id, req.body);
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json(report);
  } catch (err) {
    console.error('[Update Report] Error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

// Soft delete (admin only)
router.delete('/:id', authenticate, auditMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await reportsService.softDeleteReport(req.params.id);
    if (!result) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json({ message: 'Report deleted' });
  } catch (err) {
    console.error('[Delete Report] Error:', err);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Toggle visibility (admin only)
router.patch('/:id/toggle', authenticate, auditMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await reportsService.toggleVisibility(req.params.id);
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json(report);
  } catch {
    res.status(500).json({ error: 'Failed to toggle report' });
  }
});

// Set parameters (admin only)
router.post('/:id/parameters', authenticate, auditMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const report = await reportsService.setParameters(req.params.id, req.body.parameters);
    res.json(report);
  } catch {
    res.status(500).json({ error: 'Failed to set parameters' });
  }
});

// Grant access to user (admin only)
router.post('/:id/access', authenticate, auditMiddleware, requireAdmin, [
  body('userId').isUUID(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ errors: errors.array() }); return; }
  try {
    const result = await reportsService.grantAccess(
      req.params.id,
      req.body.userId,
      req.user!.userId
    );
    res.status(201).json(result);
  } catch {
    res.status(500).json({ error: 'Failed to grant access' });
  }
});

// Revoke access (admin only)
router.delete('/:id/access', authenticate, auditMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    await reportsService.revokeAccess(req.params.id, req.body.userId);
    res.json({ message: 'Access revoked' });
  } catch {
    res.status(500).json({ error: 'Failed to revoke access' });
  }
});

export default router;
