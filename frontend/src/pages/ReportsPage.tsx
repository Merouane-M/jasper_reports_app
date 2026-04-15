import { useState, useEffect } from 'react'
import {
  FileText, Search, Download, X, ChevronDown,
  AlertCircle, Loader2, Globe, Lock, Play
} from 'lucide-react'
import api from '../utils/api'
import { Report, ReportParameter } from '../types'

/* ── Inline MultiSelect component ── */
function MultiSelect({
  options, value, onChange
}: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  }
  return (
    <div className="multi-select-container" style={{ maxHeight:180, overflowY:'auto' }} >
      {options.map(opt => (
        <div
          key={opt}
          className={`multi-select-option${value.includes(opt) ? ' selected' : ''}`}
          onClick={() => toggle(opt)}
        >
          <div style={{
            width:16, height:16, borderRadius:4, flexShrink:0,
            border: value.includes(opt) ? '2px solid var(--brand)' : '2px solid var(--border-strong)',
            background: value.includes(opt) ? 'var(--brand)' : 'transparent',
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            {value.includes(opt) && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
          </div>
          <span>{opt}</span>
        </div>
      ))}
      {options.length === 0 && (
        <div style={{ padding:'0.75rem', color:'var(--text-muted)', fontSize:'0.85rem' }}>
          Aucune option disponible
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [params, setParams] = useState<Record<string, string | string[]>>({})
  const [outputFormat, setOutputFormat] = useState('pdf')
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/reports/').then(res => setReports(res.data)).finally(() => setLoading(false))
  }, [])

  const filtered = reports.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const openReport = (report: Report) => {
    setSelected(report)
    setError('')
    const defaults: Record<string, string | string[]> = {}
    report.parameters.forEach(p => {
      if (p.param_type === 'multiselect') {
        defaults[p.name] = p.default_value ? [p.default_value] : []
      } else {
        defaults[p.name] = p.default_value || ''
      }
    })
    setParams(defaults)
  }

  const executeReport = async () => {
    if (!selected) return
    setError('')
    for (const p of selected.parameters) {
      if (p.is_required) {
        const val = params[p.name]
        const isEmpty = Array.isArray(val) ? val.length === 0 : !val
        if (isEmpty) {
          setError(`Le champ « ${p.label} » est obligatoire.`)
          return
        }
      }
    }
    setExecuting(true)
    try {
      const res = await api.post(
        `/reports/${selected.id}/execute`,
        { ...params, output_format: outputFormat },
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected.name}.${outputFormat}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      try {
        const text = await err.response?.data?.text()
        const json = JSON.parse(text || '{}')
        setError(json.error || 'Échec de la génération du rapport')
      } catch {
        setError('Échec de la génération du rapport')
      }
    } finally {
      setExecuting(false)
    }
  }

  const renderParam = (param: ReportParameter) => {
    const val = params[param.name]

    if (param.param_type === 'multiselect') {
      return (
        <div>
          <MultiSelect
            options={param.dropdown_options}
            value={Array.isArray(val) ? val : []}
            onChange={v => setParams({ ...params, [param.name]: v })}
          />
          {Array.isArray(val) && val.length > 0 && (
            <p style={{ fontSize:'0.72rem', color:'var(--brand)', marginTop:4 }}>
              {val.length} sélectionné{val.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )
    }
    if (param.param_type === 'dropdown') {
      return (
        <div style={{ position:'relative' }}>
          <select className="input-field" style={{ paddingRight:'2rem', appearance:'none' }}
            value={(val as string) || ''}
            onChange={e => setParams({ ...params, [param.name]: e.target.value })}>
            <option value="">— Choisir —</option>
            {param.dropdown_options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown size={14} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
        </div>
      )
    }
    if (param.param_type === 'date') {
      return <input type="date" className="input-field" value={(val as string) || ''} onChange={e => setParams({ ...params, [param.name]: e.target.value })} />
    }
    if (param.param_type === 'number') {
      return <input type="number" className="input-field" placeholder="0" value={(val as string) || ''} onChange={e => setParams({ ...params, [param.name]: e.target.value })} />
    }
    return <input type="text" className="input-field" placeholder={`Entrez ${param.label}…`} value={(val as string) || ''} onChange={e => setParams({ ...params, [param.name]: e.target.value })} />
  }

  return (
    <div style={{ padding:'1.5rem', maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 className="page-title">Mes rapports</h1>
        <p className="page-sub">Consultez et exécutez vos rapports disponibles</p>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:'1.25rem', maxWidth:380 }}>
        <Search size={15} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
        <input className="input-field" style={{ paddingLeft:32 }}
          placeholder="Rechercher un rapport…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
          <Loader2 size={28} style={{ color:'var(--brand)', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'4rem', color:'var(--text-muted)' }}>
          <FileText size={40} style={{ margin:'0 auto 0.75rem', opacity:0.3 }} />
          <p style={{ margin:0 }}>Aucun rapport disponible</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'1rem' }}>
          {filtered.map(report => (
            <div key={report.id}
              className="card card-hover"
              style={{ cursor:'pointer', transition:'all 0.2s' }}
              onClick={() => openReport(report)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'0.75rem' }}>
                <div style={{
                  width:38, height:38, borderRadius:10,
                  background:'var(--brand-light)',
                  display:'flex', alignItems:'center', justifyContent:'center'
                }}>
                  <FileText size={18} style={{ color:'var(--brand)' }} />
                </div>
                {report.is_public
                  ? <span className="badge badge-green"><Globe size={10} />Public</span>
                  : <span className="badge badge-slate"><Lock size={10} />Privé</span>
                }
              </div>
              <h3 style={{ fontFamily:'Outfit', fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)', margin:'0 0 0.375rem' }}>
                {report.name}
              </h3>
              <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:'0 0 0.875rem', lineHeight:1.5,
                overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                {report.description || 'Aucune description'}
              </p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span className="badge badge-blue">{report.parameters.length} param.</span>
                <span style={{ fontSize:'0.78rem', color:'var(--brand)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                  <Play size={12} />Exécuter
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execute Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily:'Outfit', fontWeight:700, fontSize:'1.1rem', margin:0, color:'var(--text-primary)' }}>
                  {selected.name}
                </h2>
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', margin:'0.2rem 0 0' }}>
                  {selected.description}
                </p>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background:'none', border:'none', cursor:'pointer',
                color:'var(--text-muted)', padding:4, borderRadius:6,
                display:'flex', alignItems:'center'
              }}><X size={18} /></button>
            </div>

            <div className="modal-body scroll-thin" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {error && (
                <div style={{
                  display:'flex', alignItems:'center', gap:8,
                  background:'#fef2f2', border:'1px solid #fca5a5',
                  borderRadius:8, padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'#dc2626'
                }}>
                  <AlertCircle size={14} style={{ flexShrink:0 }} />{error}
                </div>
              )}

              {selected.parameters.length === 0 && (
                <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem', margin:'0.5rem 0' }}>
                  Aucun paramètre requis
                </p>
              )}

              {[...selected.parameters]
                .sort((a, b) => a.display_order - b.display_order)
                .map(param => (
                  <div key={param.id}>
                    <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                      {param.label}
                      {param.is_required && <span style={{ color:'#dc2626' }}>*</span>}
                      {param.param_type === 'multiselect' && (
                        <span className="badge badge-purple" style={{ marginLeft:4 }}>multi</span>
                      )}
                    </label>
                    {renderParam(param)}
                  </div>
                ))}

              {/* Output format */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:'0.875rem' }}>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                  Format de sortie
                </label>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {['pdf','xlsx','csv','html','docx'].map(fmt => (
                    <button key={fmt} type="button"
                      onClick={() => setOutputFormat(fmt)}
                      style={{
                        padding:'0.35rem 0.75rem', borderRadius:6, fontSize:'0.8rem',
                        fontWeight:600, cursor:'pointer', textTransform:'uppercase',
                        border: outputFormat === fmt ? '2px solid var(--brand)' : '1.5px solid var(--border)',
                        background: outputFormat === fmt ? 'var(--brand-light)' : 'var(--bg-surface)',
                        color: outputFormat === fmt ? 'var(--brand)' : 'var(--text-muted)',
                        transition:'all 0.15s'
                      }}>
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" style={{ flex:1, justifyContent:'center' }}
                onClick={() => setSelected(null)}>
                Annuler
              </button>
              <button className="btn-primary" style={{ flex:1, justifyContent:'center' }}
                disabled={executing} onClick={executeReport}>
                {executing
                  ? <><Loader2 size={15} style={{ animation:'spin 0.7s linear infinite' }} />Génération…</>
                  : <><Download size={15} />Générer le rapport</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
