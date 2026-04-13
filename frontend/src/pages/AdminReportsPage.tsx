import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Globe, Lock,
  X, Save, ChevronDown, Users, AlertCircle, CheckCircle, Loader2
} from 'lucide-react'
import api from '../utils/api'
import { Report, ReportParameter, User, UserReportAccess } from '../types'

const EMPTY_PARAM: Omit<ReportParameter, 'id' | 'report_id'> = {
  name: '', label: '', param_type: 'text', is_required: false,
  default_value: null, dropdown_options: [], display_order: 0
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Report | null>(null)
  const [accessModal, setAccessModal] = useState<Report | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [accesses, setAccesses] = useState<UserReportAccess[]>([])
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null)

  const [form, setForm] = useState({
    name: '', description: '', jasper_url: '', http_method: 'GET',
    is_public: false, is_visible: true, parameters: [] as typeof EMPTY_PARAM[]
  })

  const fetchReports = () => {
    api.get('/admin/reports').then(res => setReports(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchReports() }, [])

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', description: '', jasper_url: '', http_method: 'GET', is_public: false, is_visible: true, parameters: [] })
    setModalOpen(true)
  }

  const openEdit = (report: Report) => {
    setEditing(report)
    setForm({
      name: report.name, description: report.description || '',
      jasper_url: report.jasper_url, http_method: report.http_method,
      is_public: report.is_public, is_visible: report.is_visible,
      parameters: report.parameters.map(p => ({
        name: p.name, label: p.label, param_type: p.param_type,
        is_required: p.is_required, default_value: p.default_value,
        dropdown_options: p.dropdown_options, display_order: p.display_order
      }))
    })
    setModalOpen(true)
  }

  const saveReport = async () => {
    try {
      if (editing) {
        await api.put(`/admin/reports/${editing.id}`, form)
        showToast('Report updated')
      } else {
        await api.post('/admin/reports', form)
        showToast('Report created')
      }
      setModalOpen(false)
      fetchReports()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save', 'error')
    }
  }

  const deleteReport = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/admin/reports/${id}`)
      showToast('Report deleted')
      fetchReports()
    } catch { showToast('Failed to delete', 'error') }
  }

  const toggleVisibility = async (id: number) => {
    await api.patch(`/admin/reports/${id}/toggle-visibility`)
    fetchReports()
  }

  const openAccess = async (report: Report) => {
    setAccessModal(report)
    const [uRes, aRes] = await Promise.all([
      api.get('/users/'),
      api.get(`/admin/reports/${report.id}/access`)
    ])
    setUsers(uRes.data.filter((u: User) => u.role.name !== 'admin'))
    setAccesses(aRes.data)
  }

  const grantAccess = async (userId: number) => {
    if (!accessModal) return
    await api.post(`/admin/reports/${accessModal.id}/access`, { user_id: userId })
    const res = await api.get(`/admin/reports/${accessModal.id}/access`)
    setAccesses(res.data)
  }

  const revokeAccess = async (userId: number) => {
    if (!accessModal) return
    await api.delete(`/admin/reports/${accessModal.id}/access/${userId}`)
    const res = await api.get(`/admin/reports/${accessModal.id}/access`)
    setAccesses(res.data)
  }

  const addParam = () => setForm(f => ({ ...f, parameters: [...f.parameters, { ...EMPTY_PARAM }] }))
  const removeParam = (i: number) => setForm(f => ({ ...f, parameters: f.parameters.filter((_, idx) => idx !== i) }))
  const updateParam = (i: number, key: string, val: unknown) => {
    setForm(f => ({ ...f, parameters: f.parameters.map((p, idx) => idx === i ? { ...p, [key]: val } : p) }))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Manage Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Create and configure JasperReports</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />New Report
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-accent-400 animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="border-b border-slate-800/60">
              <tr>
                {['Name', 'URL', 'Params', 'Visibility', 'Access', 'Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell">
                    <div>
                      <p className="font-medium text-white text-sm">{r.name}</p>
                      <p className="text-xs text-slate-600 truncate max-w-48">{r.description}</p>
                    </div>
                  </td>
                  <td className="table-cell">
                    <code className="text-xs text-accent-400 font-mono bg-accent-500/10 px-2 py-0.5 rounded truncate block max-w-40">
                      {r.jasper_url}
                    </code>
                  </td>
                  <td className="table-cell">
                    <span className="badge badge-blue">{r.parameters.length}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex flex-col gap-1">
                      {r.is_visible
                        ? <span className="badge badge-green"><Eye className="w-3 h-3" />Visible</span>
                        : <span className="badge badge-slate"><EyeOff className="w-3 h-3" />Hidden</span>
                      }
                      {r.is_public
                        ? <span className="badge badge-blue"><Globe className="w-3 h-3" />Public</span>
                        : <span className="badge badge-slate"><Lock className="w-3 h-3" />Private</span>
                      }
                    </div>
                  </td>
                  <td className="table-cell">
                    <button onClick={() => openAccess(r)} className="btn-secondary py-1.5 px-3 text-xs">
                      <Users className="w-3 h-3" />Access
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleVisibility(r.id)} className="p-1.5 text-slate-500 hover:text-accent-400 transition-colors" title="Toggle visibility">
                        {r.is_visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteReport(r.id, r.name)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-slate-600">No reports yet. Create your first one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60 shrink-0">
              <h2 className="font-display font-bold text-white">{editing ? 'Edit Report' : 'New Report'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="overflow-y-auto scroll-custom p-5 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Report Name *</label>
                  <input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                  <textarea className="input-field resize-none" rows={2} value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Jasper API URL *</label>
                  <input className="input-field font-mono text-xs" placeholder="/reports/samples/monthly_sales"
                    value={form.jasper_url} onChange={e => setForm({...form, jasper_url: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">HTTP Method</label>
                  <div className="relative">
                    <select className="input-field appearance-none pr-8" value={form.http_method}
                      onChange={e => setForm({...form, http_method: e.target.value})}>
                      <option>GET</option><option>POST</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-5">
                  {[{key: 'is_public', label: 'Public'}, {key: 'is_visible', label: 'Visible'}].map(({key, label}) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 accent-sky-500 rounded"
                        checked={form[key as 'is_public'|'is_visible']}
                        onChange={e => setForm({...form, [key]: e.target.checked})} />
                      <span className="text-sm text-slate-400">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div className="border-t border-slate-800/60 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white">Parameters</h3>
                  <button onClick={addParam} className="btn-secondary py-1.5 px-3 text-xs">
                    <Plus className="w-3 h-3" />Add
                  </button>
                </div>
                <div className="space-y-3">
                  {form.parameters.map((p, i) => (
                    <div key={i} className="bg-navy-800/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-mono">param_{i + 1}</span>
                        <button onClick={() => removeParam(i)} className="text-slate-600 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input-field text-xs py-2" placeholder="Name (API key)"
                          value={p.name} onChange={e => updateParam(i, 'name', e.target.value)} />
                        <input className="input-field text-xs py-2" placeholder="Label (display)"
                          value={p.label} onChange={e => updateParam(i, 'label', e.target.value)} />
                        <div className="relative">
                          <select className="input-field text-xs py-2 appearance-none pr-7"
                            value={p.param_type} onChange={e => updateParam(i, 'param_type', e.target.value)}>
                            {['text','number','date','dropdown'].map(t => <option key={t}>{t}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        </div>
                        <input className="input-field text-xs py-2" placeholder="Default value"
                          value={p.default_value || ''} onChange={e => updateParam(i, 'default_value', e.target.value)} />
                      </div>
                      {p.param_type === 'dropdown' && (
                        <input className="input-field text-xs py-2" placeholder="Options (comma-separated)"
                          value={p.dropdown_options.join(',')}
                          onChange={e => updateParam(i, 'dropdown_options', e.target.value.split(',').map(s => s.trim()))} />
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" className="w-3.5 h-3.5 accent-sky-500"
                          checked={p.is_required} onChange={e => updateParam(i, 'is_required', e.target.checked)} />
                        <span className="text-xs text-slate-500">Required</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-800/60 shrink-0">
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={saveReport} className="btn-primary flex-1 justify-center">
                <Save className="w-4 h-4" />{editing ? 'Save Changes' : 'Create Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Access Control Modal */}
      {accessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
              <div>
                <h2 className="font-display font-bold text-white">Access Control</h2>
                <p className="text-xs text-slate-500 mt-0.5">{accessModal.name}</p>
              </div>
              <button onClick={() => setAccessModal(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 max-h-80 overflow-y-auto scroll-custom">
              {users.map(u => {
                const hasAccess = accesses.some(a => a.user_id === u.id)
                return (
                  <div key={u.id} className="flex items-center justify-between bg-navy-800/50 rounded-lg px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-white">{u.username}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <button
                      onClick={() => hasAccess ? revokeAccess(u.id) : grantAccess(u.id)}
                      className={hasAccess ? 'btn-danger py-1.5 px-3 text-xs' : 'btn-primary py-1.5 px-3 text-xs'}>
                      {hasAccess ? 'Revoke' : 'Grant'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-slate-800/60">
              <button onClick={() => setAccessModal(null)} className="btn-secondary w-full justify-center">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
