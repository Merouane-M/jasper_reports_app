export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

export interface ReportParameter {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'dropdown';
  required: boolean;
  defaultValue?: string;
  options?: string; // JSON string of options
  sortOrder: number;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  jasperUrl: string;
  httpMethod: string;
  isPublic: boolean;
  isActive: boolean;
  deletedAt?: string;
  createdAt: string;
  createdByName?: string;
  parameters?: ReportParameter[];
}

export interface AuditLog {
  id: string;
  adminUserId: string;
  adminEmail: string;
  adminName: string;
  actionType: string;
  entityType: string;
  entityId?: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface AuditFilters {
  from?: string;
  to?: string;
  adminUserId?: string;
  actionType?: string;
  entityType?: string;
  search?: string;
  page?: number;
  limit?: number;
}
