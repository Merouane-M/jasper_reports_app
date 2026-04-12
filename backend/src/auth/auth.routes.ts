import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from './auth.service';
import { authenticate } from '../common/middleware/auth.middleware';

const router = Router();

// Lenient email validation regex that accepts most common email formats
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerValidation = [
  body('email')
    .trim()
    .matches(emailRegex)
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('firstName').trim().isLength({ min: 1, max: 100 }),
  body('lastName').trim().isLength({ min: 1, max: 100 }),
];

router.post('/register', registerValidation, async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ message: 'Registration successful', user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: msg });
  }
});

router.post('/login', [
  body('email')
    .trim()
    .matches(emailRegex)
    .withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('[AUTH] Login validation errors:', errors.array());
    res.status(400).json({ errors: errors.array() });
    return;
  }
  try {
    const ip = req.ip ?? 'unknown';
    const result = await authService.login(req.body, ip);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: msg });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token required' });
    return;
  }
  try {
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) await authService.logout(refreshToken);
  res.json({ message: 'Logged out' });
});

export default router;
