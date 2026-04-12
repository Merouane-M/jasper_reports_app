import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { getPool } from './db';
import authRoutes    from './auth/auth.routes';
import reportRoutes  from './reports/reports.routes';
import jasperRoutes  from './jasper/jasper.routes';
import auditRoutes   from './audit/audit.routes';
import userRoutes    from './users/users.routes';

dotenv.config();

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ─── Security headers ────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:3000',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));

// ─── Body parsing ────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ─────────────────────────────
app.use(morgan('dev'));

// ─── Rate limiting ───────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use('/api/', limiter);

// Stricter limiter on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { error: 'Too many authentication attempts, try again later' },
});
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Routes ──────────────────────────────────────
// Note: audit middleware is applied to individual mutating routes
app.use('/api/auth',    authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/jasper',  jasperRoutes);
app.use('/api/audit',   auditRoutes);
app.use('/api/users',   userRoutes);

// ─── Health check ────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── 404 handler ─────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global error handler ────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
