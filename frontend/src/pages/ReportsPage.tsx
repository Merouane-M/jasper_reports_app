import { useState, useEffect } from 'react'
import { FileText, Search, Play, Download, X, ChevronDown, AlertCircle, Loader2, Globe, Lock } from 'lucide-react'
import api from '../utils/api'
import { Report, ReportParameter } from '../types'

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [params, setParams] = useState<Record<string, string>>({})
  const [outputFormat, setOutputFormat] = useState('pdf')
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/reports/').then(res => setReports(res.data)).finally(() => setLoading(false))
  }, [])

  const filtered = reports.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  )

  const openReport = (report: Report) => {
    setSelected(report)
    setError('')
    const defaults: Record<string, string> = {}
    report.parameters.forEach(p => {
      if (p.default_value) defaults[p.name] = p.default_value
    })
    setParams(defaults)
  }

  const executeReport = async () => {
    if (!selected) return
    setError('')
    // Validate required
    for (const p of selected.parameters) {
      if (p.is_required && !params[p.name]) {
        setError(`"${p.label}" is required`)
        return
      }
    }
    setExecuting(true)
    try {
      const res = await api.post(`/reports/${selected.id}/execute`,
        { ...params, output_format: outputFormat },
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected.name}.${outputFormat}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      const text = await err.response?.data?.text?.()
      try {
        const json = JSON.parse(text || '{}')
        setError(json.error || 'Failed to execute report')
      } catch {
        setError('Failed to execute report')
      }
    } finally {
      setExecuting(false)
    }
  }

  const renderParamInput = (param: ReportParameter) => {
    const base = "input-field"
    const val = params[param.name] || ''
    const onChange = (v: string) => setParams({ ...params, [param.name]: v })

    if (param.param_type === 'dropdown') {
      return (
        <div className="relative">
          <select className={`${base} appearance-none pr-8`} value={val} onChange={e => onChange(e.target.value)}>
            <option value="">Select an option...</option>
            {param.dropdown_options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      )
    }
    if (param.param_type === 'date') {
      return <input type="date" className={base} value={val} onChange={e => onChange(e.target.value)} />
    }
    if (param.param_type === 'number') {
      return <input type="number" className={base} value={val} onChange={e => onChange(e.target.value)} />
    }
    return <input type="text" className={base} placeholder={`Enter ${param.label}...`} value={val} onChange={e => onChange(e.target.value)} />
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="section-title">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Browse and execute available reports</p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          className="input-field pl-9"
          placeholder="Search reports..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Reports grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-accent-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-600">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No reports available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(report => (
            <div key={report.id}
              className="card glass-hover cursor-pointer group animate-fade-in"
              onClick={() => openReport(report)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-accent-500/10 border border-accent-500/20 rounded-lg flex items-center justify-center group-hover:bg-accent-500/20 transition-colors">
                  <FileText className="w-4 h-4 text-accent-400" />
                </div>
                {report.is_public
                  ? <span className="badge badge-green"><Globe className="w-3 h-3" />Public</span>
                  : <span className="badge badge-slate"><Lock className="w-3 h-3" />Private</span>
                }
              </div>
              <h3 className="font-display font-semibold text-white text-sm mb-1 group-hover:text-accent-300 transition-colors">
                {report.name}
              </h3>
              <p className="text-slate-500 text-xs line-clamp-2 mb-3">
                {report.description || 'No description provided'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{report.parameters.length} param{report.parameters.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-accent-500 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Run report →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execute modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
              <div>
                <h2 className="font-display font-bold text-white">{selected.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{selected.description}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-96 overflow-y-auto scroll-custom">
              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              {selected.parameters.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-2">No parameters required</p>
              )}

              {selected.parameters
                .sort((a, b) => a.display_order - b.display_order)
                .map(param => (
                  <div key={param.id}>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      {param.label}
                      {param.is_required && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {renderParamInput(param)}
                  </div>
                ))}

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Output Format</label>
                <div className="relative">
                  <select className="input-field appearance-none pr-8"
                    value={outputFormat} onChange={e => setOutputFormat(e.target.value)}>
                    {['pdf', 'xlsx', 'csv', 'html', 'docx'].map(f => (
                      <option key={f} value={f}>{f.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-800/60">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1 justify-center">
                Cancel
              </button>
              <button onClick={executeReport} disabled={executing}
                className="btn-primary flex-1 justify-center disabled:opacity-50">
                {executing
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                  : <><Download className="w-4 h-4" />Generate Report</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
