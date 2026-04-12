import { Request, Response, NextFunction } from 'express';
import { query } from '../../db';

// Map HTTP method + route pattern → action type
const ACTION_MAP: Record<string, Record<string, string>> = {
  POST:   {
    '/api/reports':           'CREATE_REPORT',
    '/api/users':             'CREATE_USER',
    '/api/reports/:id/access': 'GRANT_ACCESS',
    '/api/auth/login':        'LOGIN_ATTEMPT',
  },
  PUT:    {
    '/api/reports/:id':       'UPDATE_REPORT',
    '/api/users/:id':         'UPDATE_USER',
    '/api/users/:id/role':    'CHANGE_ROLE',
  },
  PATCH:  {
    '/api/reports/:id':       'UPDATE_REPORT',
    '/api/reports/:id/toggle':'TOGGLE_VISIBILITY',
  },
  DELETE: {
    '/api/reports/:id':         'DELETE_REPORT',
    '/api/reports/:id/access':  'REVOKE_ACCESS',
    '/api/users/:id':           'DELETE_USER',
  },
};

function resolveAction(method: string, path: string): string | null {
  const methodMap = ACTION_MAP[method];
  if (!methodMap) return null;

  // Match exactly first
  if (methodMap[path]) return methodMap[path];

  // Pattern match (replace UUIDs with :id)
  const normalized = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
  return methodMap[normalized] ?? null;
}

function resolveEntity(path: string): { type: string; id?: string } {
  if (path.includes('/reports')) {
    const match = path.match(/reports\/([^/]+)/);
    return { type: 'Report', id: match?.[1] };
  }
  if (path.includes('/users')) {
    const match = path.match(/users\/([^/]+)/);
    return { type: 'User', id: match?.[1] };
  }
  return { type: 'System' };
}

export const auditMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Only log for authenticated admin users on mutating requests
  if (!req.user || req.user.role !== 'admin') {
    next();
    return;
  }

  const action = resolveAction(req.method, req.path);
  if (!action) {
    next();
    return;
  }

  const { type: entityType, id: entityId } = resolveEntity(req.path);
  const beforeSnapshot = req.body ? { ...req.body } : undefined;

  // Capture response to get after-state
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    // Fire-and-forget audit log insert
    if (res.statusCode < 400) {
      console.log(`[Audit] Logging action: ${action} for ${entityType} ${entityId}`);
      query(
        `INSERT INTO audit_logs
          (admin_user_id, action_type, entity_type, entity_id,
           before_snapshot, after_snapshot, ip_address, user_agent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          req.user!.userId,
          action,
          entityType,
          entityId ?? null,
          beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
          body ? JSON.stringify(body) : null,
          req.ip,
          req.headers['user-agent'] ?? null,
        ]
      ).catch(err => {
        console.error('[Audit] Failed to write log:', err);
      });
    }
    return originalJson(body);
  };

  next();
};
