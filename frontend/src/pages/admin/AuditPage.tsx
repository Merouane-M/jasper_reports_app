import { useEffect, useState, useCallback } from 'react';
import { auditApi } from '../../services/api';
import { AuditLog, AuditFilters } from '../../types';

const ACTION_COLORS: Record<string, string> = {
  CREATE_REPORT:    'bg-green-50 text-green-700',
  UPDATE_REPORT:    'bg-blue-50 text-blue-700',
  DELETE_REPORT:    'bg-red-50 text-red-700',
  TOGGLE_VISIBILITY:'bg-amber-50 text-amber-700',
  GRANT_ACCESS:     'bg-purple-50 text-purple-700',
  REVOKE_ACCESS:    'bg-pink-50 text-pink-700',
  CHANGE_ROLE:      'bg-orange-50 text-orange-700',
  CREATE_USER:      'bg-teal-50 text-teal-700',
  LOGIN_ATTEMPT:    'bg-gray-100 text-gray-600',
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {action.replace(/_/g, ' ')}
    </span>
  );
}

function SnapshotModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Change details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="grid grid-cols-2 gap-4 overflow-y-auto">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Before</p>
            <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto text-gray-700 border border-gray-100 min-h-[120px]">
              {log.beforeSnapshot
                ? JSON.stringify(log.beforeSnapshot, null, 2)
                : <span className="text-gray-400 italic">—</span>}
            </pre>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">After</p>
            <pre className="text-xs bg-gray-50 rounded-lg p-3 overflow-auto text-gray-700 border border-gray-100 min-h-[120px]">
              {log.afterSnapshot
                ? JSON.stringify(log.afterSnapshot, null, 2)
                : <span className="text-gray-400 italic">—</span>}
            </pre>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-400">
          <span>IP: {log.ipAddress ?? '—'}</span>
          <span className="truncate">UA: {log.userAgent ?? '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [logs,        setLogs]        = useState<AuditLog[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [exporting,   setExporting]   = useState(false);
  const [detailLog,   setDetailLog]   = useState<AuditLog | null>(null);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [pagination,  setPagination]  = useState({ total: 0, page: 1, limit: 20, pages: 1 });

  const [filters, setFilters] = useState<AuditFilters>({
    from: '', to: '', adminUserId: '', actionType: '', entityType: '', search: '',
    page: 1, limit: 20,
  });

  const buildParams = useCallback((f: AuditFilters) => {
    const p: Record<string, string | number> = { page: f.page ?? 1, limit: f.limit ?? 20 };
    if (f.from)         p.from         = f.from;
    if (f.to)           p.to           = f.to;
    if (f.actionType)   p.actionType   = f.actionType;
    if (f.entityType)   p.entityType   = f.entityType;
    if (f.search)       p.search       = f.search;
    if (f.adminUserId)  p.adminUserId  = f.adminUserId;
    return p;
  }, []);

  const loadLogs = useCallback((f: AuditFilters) => {
    setLoading(true);
    auditApi.list(buildParams(f))
      .then(r => {
        setLogs(r.data.data ?? []);
        setPagination(r.data.pagination ?? { total: 0, page: 1, limit: 20, pages: 1 });
      })
      .finally(() => setLoading(false));
  }, [buildParams]);

  useEffect(() => {
    loadLogs(filters);
    auditApi.meta().then(r => {
      setActionTypes(r.data.actionTypes);
      setEntityTypes(r.data.entityTypes);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (key: keyof AuditFilters, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const applyFilters = () => loadLogs({ ...filters, page: 1 });

  const resetFilters = () => {
    const fresh: AuditFilters = {
      from: '', to: '', adminUserId: '', actionType: '',
      entityType: '', search: '', page: 1, limit: 20,
    };
    setFilters(fresh);
    loadLogs(fresh);
  };

  const goPage = (p: number) => {
    const updated = { ...filters, page: p };
    setFilters(updated);
    loadLogs(updated);
  };

  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    setExporting(true);
    try {
      const params = { ...buildParams(filters), format };
      const res = await auditApi.export(params);
      const mimes: Record<string, string> = {
        csv:  'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        json: 'application/json',
      };
      const blob = new Blob([res.data], { type: mimes[format] });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Audit Logs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination?.total?.toLocaleString() ?? 0} total entries — immutable record of all admin actions
          </p>
        </div>
        <div className="flex gap-2">
          {(['csv', 'xlsx', 'json'] as const).map(fmt => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              disabled={exporting}
              className="btn-secondary text-xs"
            >
              {exporting ? '…' : `Export ${fmt.toUpperCase()}`}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="label text-xs">From</label>
            <input type="date" className="input text-xs" value={filters.from}
              onChange={e => setFilter('from', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">To</label>
            <input type="date" className="input text-xs" value={filters.to}
              onChange={e => setFilter('to', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Action type</label>
            <select className="input text-xs" value={filters.actionType}
              onChange={e => setFilter('actionType', e.target.value)}>
              <option value="">All actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Entity type</label>
            <select className="input text-xs" value={filters.entityType}
              onChange={e => setFilter('entityType', e.target.value)}>
              <option value="">All entities</option>
              {entityTypes.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Search</label>
            <input className="input text-xs" placeholder="Email, action…" value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyFilters()} />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={applyFilters} className="btn-primary text-xs flex-1 justify-center">Apply</button>
            <button onClick={resetFilters} className="btn-secondary text-xs">Reset</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Timestamp', 'Admin', 'Action', 'Entity', 'IP', 'Details'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                  No audit logs match your filters
                </td>
              </tr>
            ) : logs.map(log => {
              const adminName = log.adminName ?? (log as unknown as { admin_name: string }).admin_name ?? '—';
              const adminEmail = log.adminEmail ?? (log as unknown as { admin_email: string }).admin_email ?? '';
              const actionType = log.actionType ?? (log as unknown as { action_type: string }).action_type;
              const entityType = log.entityType ?? (log as unknown as { entity_type: string }).entity_type;
              const createdAt  = log.createdAt  ?? (log as unknown as { created_at: string }).created_at;
              const ipAddress  = log.ipAddress  ?? (log as unknown as { ip_address: string }).ip_address;
              const hasDiff    = log.beforeSnapshot || log.afterSnapshot;

              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{adminName}</p>
                    <p className="text-xs text-gray-400">{adminEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={actionType} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{entityType}</p>
                    {log.entityId && (
                      <p className="text-xs text-gray-400 font-mono truncate max-w-[140px]">
                        {log.entityId}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    {ipAddress ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {hasDiff ? (
                      <button
                        onClick={() => setDetailLog(log)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        View diff
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Showing {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total ?? 0)} of {(pagination.total ?? 0).toLocaleString()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => goPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-xs"
            >
              ← Prev
            </button>
            {[...Array(Math.min(pagination.pages, 7))].map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => goPage(p)}
                  className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    p === pagination.page
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => goPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 text-xs"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailLog && (
        <SnapshotModal log={detailLog} onClose={() => setDetailLog(null)} />
      )}
    </div>
  );
}
