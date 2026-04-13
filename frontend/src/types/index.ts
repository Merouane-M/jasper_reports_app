export interface Role {
  id: number
  name: string
  description: string
}

export interface User {
  id: number
  username: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  last_login: string | null
}

export interface ReportParameter {
  id: number
  report_id: number
  name: string
  label: string
  param_type: 'text' | 'number' | 'date' | 'dropdown'
  is_required: boolean
  default_value: string | null
  dropdown_options: string[]
  display_order: number
}

export interface Report {
  id: number
  name: string
  description: string
  jasper_url: string
  http_method: string
  is_public: boolean
  is_visible: boolean
  created_at: string
  parameters: ReportParameter[]
}

export interface AuditLog {
  id: number
  admin_user_id: number
  admin_username: string
  action_type: string
  entity_type: string
  entity_id: number | null
  entity_name: string | null
  changes_before: Record<string, unknown> | null
  changes_after: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  timestamp: string
  description: string | null
}

export interface PaginatedAuditLogs {
  logs: AuditLog[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface AuditStats {
  total: number
  by_action: { action: string; count: number }[]
  by_entity: { entity: string; count: number }[]
}

export interface UserReportAccess {
  id: number
  user_id: number
  report_id: number
  username: string
  email: string
  granted_at: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
}
