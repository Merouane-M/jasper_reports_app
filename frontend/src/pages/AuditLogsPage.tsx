import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Filter, Download, ChevronLeft, ChevronRight,
  X, Search, FileText, FileSpreadsheet, Code2, Loader2,
  ChevronDown, Eye
} from 'lucide-react'
import api from '../utils/api'
import { AuditLog, PaginatedAuditLogs, AuditStats, User } from '../types'

const ACTION_COLORS: Record<string, string> = {
  CREATE_REPORT: 'badge-green',
  UPDATE_REPORT: 'badge-blue',
  DELETE_REPORT: 'badge-red',
  TOGGLE_VISIBILITY: 'badge-amber',
  TOGGLE_PUBLIC: 'badge-amber',
  CREATE_USER: 'badge-green',
  UPDATE_USER: 'badge-blue',
  DEACTIVATE_USER: 'badge-red',
  ACTIVATE_USER: 'badge-green',
  CHANGE_ROLE: 'badge-amber',
  GRANT_ACCESS: 'badge-green',
  REVOKE_ACCESS: 'badge-red',
  LOGIN_SUCCESS: 'badge-blue',
  LOGIN_FAILED: 'badge-red',
  ADD_PARAMETER: 'badge-green',
  UPDATE_PARAMETER: 'badge-blue',
  DELETE_PARAMETER: 'badge-red',
}

export default function AuditLogsPage() {
  const [data, setData] = useState<PaginatedAuditLogs | null>(null)
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [entityTypes, setEntityTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null)

  const [filters, setFilters] = useState({
    page: 1, per_page: 20, search: '',
    admin_user_id: '', action_type: '', entity_type: '',
    date_from: '', date_to: '',
  })

  const buildParams = useCallback(() => {
    const p: Record<string, string> = { page: String(filters.page), per_page: String(filters.per_page) }
    if (filters.search) p.search = filters.search
    if (filters.admin_user_id) p.admin_user_id = filters.admin_user_id
    if (filters.action_type) p.action_type = filters.action_type
    if (filters.entity_type) p.entity_type = filters.entity_type
    if (filters.date_from) p.date_from = filters.date_from
    if (filters.date_to) p.date_to = filters.date_to
    return new URLSearchParams(p).toString()
  }, [filters])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/audit/?${buildParams()}`)
      setData(res.data)
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  useEffect(() => {
    api.get('/audit/stats').then(res => setStats(res.data))
    api.get('/users/').then(res => setUsers(res.data))
    api.get('/audit/action-types').then(res => setActionTypes(res.data))
    api.get('/audit/entity-types').then(res => setEntityTypes(res.data))
  }, [])

  const exportLogs = async (format: 'csv' | 'json' | 'xlsx') => {
    const res = await api.get(`/audit/export/${format}?${buildParams()}`, { responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_logs.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => {
    setFilters({ page: 1, per_page: 20, search: '', admin_user_id: '', action_type: '', entity_type: '', date_from: '', date_to: '' })
  }

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts)
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-400" />Audit Logs
          </h1>
          <p className="text-slate-500 text-sm mt-1">Immutable record of all administrative actions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 mr-1">Export:</span>
          {[
            { fmt: 'csv' as const, icon: FileText, label: 'CSV' },
            { fmt: 'xlsx' as const, icon: FileSpreadsheet, label: 'XLSX' },
            { fmt: 'json' as const, icon: Code2, label: 'JSON' },
          ].map(({ fmt, icon: Icon, label }) => (
            <button key={fmt} onClick={() => exportLogs(fmt)} className="btn-secondary py-1.5 px-3 text-xs">
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <p className="font-display text-3xl font-bold text-white">{stats.total.toLocaleString()}</p>
            <p className="text-slate-500 text-xs mt-1">Total Events</p>
          </div>
          {stats.by_action.slice(0, 3).map(a => (
            <div key={a.action} className="card">
              <p className="font-display text-2xl font-bold text-accent-400">{a.count}</p>
              <p className="text-slate-500 text-xs mt-1 truncate">{a.action.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-400">Filters</h3>
          <button onClick={resetFilters} className="ml-auto text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Clear all
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input className="input-field pl-8 py-2 text-xs" placeholder="Search logs..."
              value={filters.search} onChange={e => setFilters({...filters, search: e.target.value, page: 1})} />
          </div>

          {[
            {
              key: 'admin_user_id', placeholder: 'All users',
              options: users.map(u => ({ value: String(u.id), label: u.username }))
            },
            {
              key: 'action_type', placeholder: 'All actions',
              options: actionTypes.map(a => ({ value: a, label: a.replace(/_/g, ' ') }))
            },
            {
              key: 'entity_type', placeholder: 'All entities',
              options: entityTypes.map(e => ({ value: e, label: e }))
            },
          ].map(({ key, placeholder, options }) => (
            <div key={key} className="relative">
              <select className="input-field appearance-none pr-7 py-2 text-xs"
                value={filters[key as keyof typeof filters]}
                onChange={e => setFilters({...filters, [key]: e.target.value, page: 1})}>
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            </div>
          ))}

          <div className="flex gap-2">
            <input type="date" className="input-field py-2 text-xs flex-1"
              value={filters.date_from} onChange={e => setFilters({...filters, date_from: e.target.value, page: 1})}
              title="From date" />
          </div>
        </div>
        <div className="mt-2">
          <input type="date" className="input-field py-2 text-xs w-48"
            value={filters.date_to} onChange={e => setFilters({...filters, date_to: e.target.value, page: 1})}
            title="To date" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-accent-400 animate-spin" /></div>
        ) : (
          <>
            <table className="w-full">
              <thead className="border-b border-slate-800/60">
                <tr>
                  {['Time', 'Admin', 'Action', 'Entity', 'Description', 'IP', ''].map(h => (
                    <th key={h} className="table-head">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.logs.map(log => (
                  <tr key={log.id} className="table-row">
                    <td className="table-cell text-xs text-slate-500 whitespace-nowrap">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-accent-500/15 flex items-center justify-center shrink-0">
                          <span className="text-accent-400 text-[9px] font-bold uppercase">{log.admin_username?.[0]}</span>
                        </div>
                        <span className="text-sm text-slate-300">{log.admin_username}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${ACTION_COLORS[log.action_type] || 'badge-slate'} text-[10px]`}>
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div>
                        <span className="badge badge-slate text-[10px]">{log.entity_type}</span>
                        {log.entity_name && <p className="text-xs text-slate-600 mt-0.5 truncate max-w-28">{log.entity_name}</p>}
                      </div>
                    </td>
                    <td className="table-cell text-xs text-slate-400 max-w-52 truncate">{log.description}</td>
                    <td className="table-cell text-xs text-slate-600 font-mono">{log.ip_address}</td>
                    <td className="table-cell">
                      {(log.changes_before || log.changes_after) && (
                        <button onClick={() => setDetailLog(log)}
                          className="p-1.5 text-slate-600 hover:text-accent-400 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!data?.logs.length) && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-600">No audit logs found</td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/60">
                <p className="text-xs text-slate-600">
                  Showing {((filters.page - 1) * filters.per_page) + 1}–{Math.min(filters.page * filters.per_page, data.total)} of {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <button disabled={filters.page <= 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    className="btn-secondary py-1.5 px-2 text-xs disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-500">Page {filters.page} of {data.pages}</span>
                  <button disabled={filters.page >= data.pages}
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    className="btn-secondary py-1.5 px-2 text-xs disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {detailLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
              <div>
                <h2 className="font-display font-bold text-white">Change Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">{detailLog.action_type} · {formatTimestamp(detailLog.timestamp)}</p>
              </div>
              <button onClick={() => setDetailLog(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-96 overflow-y-auto scroll-custom">
              {detailLog.changes_before && (
                <div>
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Before</p>
                  <pre className="bg-navy-800/60 rounded-lg p-3 text-xs text-slate-400 overflow-x-auto font-mono">
                    {JSON.stringify(detailLog.changes_before, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.changes_after && (
                <div>
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">After</p>
                  <pre className="bg-navy-800/60 rounded-lg p-3 text-xs text-slate-400 overflow-x-auto font-mono">
                    {JSON.stringify(detailLog.changes_after, null, 2)}
                  </pre>
                </div>
              )}
              <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-800/60">
                <p>User Agent: {detailLog.user_agent || 'N/A'}</p>
                <p>Log ID: #{detailLog.id}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
