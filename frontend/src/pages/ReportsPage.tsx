import { useState, useEffect, useRef } from 'react'
import {
  FileText, Search, Download, X, ChevronDown,
  AlertCircle, Loader2, Globe, Lock, Play,
  Eye, EyeOff, RefreshCw, ExternalLink, ZoomIn, ZoomOut
} from 'lucide-react'
import api from '../utils/api'
import { Report, ReportParameter } from '../types'

/* ── MultiSelect ── */
function MultiSelect({
  options, value, onChange
}: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt])
  return (
    <div className="multi-select-container" style={{ maxHeight: 180, overflowY: 'auto' }}>
      {options.map(opt => (
        <div
          key={opt}
          className={`multi-select-option${value.includes(opt) ? ' selected' : ''}`}
          onClick={() => toggle(opt)}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            border: value.includes(opt) ? '2px solid var(--brand)' : '2px solid var(--border-strong)',
            background: value.includes(opt) ? 'var(--brand)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {value.includes(opt) && (
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 5l2.5 2.5 3.5-4" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <span>{opt}</span>
        </div>
      ))}
      {options.length === 0 && (
        <div style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Aucune option disponible
        </div>
      )}
    </div>
  )
}

/* ── Preview pane ── */
function PreviewPane({
  previewUrl,
  previewError,
  previewing,
  format,
  reportName,
  onDownload,
  onClose,
}: {
  previewUrl: string | null
  previewError: string
  previewing: boolean
  format: string
  reportName: string
  onDownload: (fmt: string) => void
  onClose: () => void
}) {
  const [zoom, setZoom] = useState(100)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const canZoom = format === 'pdf' || format === 'html'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
    }}>
      {/* Preview header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.625rem 1rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface-2)',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Eye size={15} style={{ color: 'var(--brand)' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif' }}>
            Aperçu — {reportName}
          </span>
          {previewing && (
            <Loader2 size={13} style={{ color: 'var(--brand)', animation: 'spin 0.7s linear infinite', marginLeft: 4 }} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {canZoom && previewUrl && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                title="Zoom out"
                style={iconBtn}
              ><ZoomOut size={13} /></button>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 34, textAlign: 'center' }}>
                {zoom}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(200, z + 10))}
                title="Zoom in"
                style={iconBtn}
              ><ZoomIn size={13} /></button>
            </>
          )}
          {previewUrl && format === 'html' && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              title="Ouvrir dans un nouvel onglet"
              style={{ ...iconBtn, textDecoration: 'none', color: 'var(--text-secondary)' }}
            ><ExternalLink size={13} /></a>
          )}
          <button onClick={onClose} title="Fermer l'aperçu" style={iconBtn}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Preview body */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', background: '#f0f2f5' }}>
        {previewing && !previewUrl && (
          <div style={centeredMsg}>
            <Loader2 size={32} style={{ color: 'var(--brand)', animation: 'spin 0.7s linear infinite', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Génération de l'aperçu…</p>
          </div>
        )}

        {previewError && (
          <div style={centeredMsg}>
            <AlertCircle size={32} style={{ color: '#dc2626', marginBottom: 12, opacity: 0.7 }} />
            <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0, textAlign: 'center', maxWidth: 300 }}>
              {previewError}
            </p>
          </div>
        )}

        {!previewing && !previewUrl && !previewError && (
          <div style={centeredMsg}>
            <EyeOff size={36} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.4 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Cliquez sur <strong>Aperçu</strong> pour visualiser le rapport
            </p>
          </div>
        )}

        {previewUrl && (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            title="Aperçu du rapport"
            style={{
              width: `${10000 / zoom}%`,
              height: `${10000 / zoom}%`,
              border: 'none',
              transform: `scale(${zoom / 100})`,
              transformOrigin: '0 0',
            }}
          />
        )}
      </div>

      {/* Export footer */}
      {previewUrl && (
        <div style={{
          padding: '0.625rem 1rem',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface-2)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: 4 }}>Exporter en :</span>
          {EXPORT_FORMATS.map(fmt => (
            <button
              key={fmt.value}
              onClick={() => onDownload(fmt.value)}
              style={{
                ...exportBtn,
                background: fmt.value === format ? 'var(--brand-light)' : 'var(--bg-surface)',
                color: fmt.value === format ? 'var(--brand)' : 'var(--text-secondary)',
                border: `1.5px solid ${fmt.value === format ? 'var(--brand)' : 'var(--border)'}`,
              }}
            >
              <Download size={11} />
              {fmt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Constants ── */
const EXPORT_FORMATS = [
  { value: 'pdf',  label: 'PDF'  },
  { value: 'xlsx', label: 'Excel' },
  { value: 'csv',  label: 'CSV'  },
  { value: 'docx', label: 'Word' },
]

/* ── Inline styles (shared small pieces) ── */
const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text-secondary)', padding: 5, borderRadius: 6,
  display: 'flex', alignItems: 'center',
  transition: 'background 0.12s',
}
const exportBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '0.3rem 0.65rem', borderRadius: 6,
  fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
  fontFamily: 'Outfit, sans-serif', transition: 'all 0.15s',
}
const centeredMsg: React.CSSProperties = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
}

/* ══════════════════════════════════════════
   Main page
══════════════════════════════════════════ */
export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Report | null>(null)
  const [params, setParams] = useState<Record<string, string | string[]>>({})
  const [outputFormat, setOutputFormat] = useState('pdf')
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState('')

  /* Preview state */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState('')
  const [previewing, setPreviewing] = useState(false)
  const prevUrlRef = useRef<string | null>(null)

  useEffect(() => {
    api.get('/reports/').then(res => setReports(res.data)).finally(() => setLoading(false))
  }, [])

  /* Revoke blob URL on unmount */
  useEffect(() => {
    return () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current) }
  }, [])

  const filtered = reports.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const openReport = (report: Report) => {
    setSelected(report)
    setError('')
    clearPreview()
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

  const clearPreview = () => {
    if (prevUrlRef.current) { URL.revokeObjectURL(prevUrlRef.current); prevUrlRef.current = null }
    setPreviewUrl(null)
    setPreviewError('')
  }

  const validateParams = (): boolean => {
    if (!selected) return false
    for (const p of selected.parameters) {
      if (p.is_required) {
        const val = params[p.name]
        if (Array.isArray(val) ? val.length === 0 : !val) {
          setError(`Le champ « ${p.label} » est obligatoire.`)
          return false
        }
      }
    }
    return true
  }

  /* Preview: always renders HTML in the iframe */
  const handlePreview = async () => {
    if (!selected) return
    setError('')
    if (!validateParams()) return
    clearPreview()
    setPreviewing(true)
    setPreviewError('')
    try {
      const res = await api.post(
        `/reports/${selected.id}/execute`,
        { ...params, output_format: 'html' },
        { responseType: 'blob' }
      )
      const blob = new Blob([res.data], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      prevUrlRef.current = url
      setPreviewUrl(url)
    } catch (err: any) {
      let msg = 'Échec de la génération de l\'aperçu'
      try {
        const text = await err.response?.data?.text()
        const json = JSON.parse(text || '{}')
        msg = json.error || msg
      } catch { /* ignore */ }
      setPreviewError(msg)
    } finally {
      setPreviewing(false)
    }
  }

  /* Export: downloads in the chosen format */
  const handleExport = async (fmt: string) => {
    if (!selected) return
    setError('')
    if (!validateParams()) return
    setExecuting(true)
    try {
      const res = await api.post(
        `/reports/${selected.id}/execute`,
        { ...params, output_format: fmt },
        { responseType: 'blob' }
      )
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${selected.name}.${fmt}`
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
            <p style={{ fontSize: '0.72rem', color: 'var(--brand)', marginTop: 4 }}>
              {val.length} sélectionné{val.length > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )
    }
    if (param.param_type === 'dropdown') {
      return (
        <div style={{ position: 'relative' }}>
          <select className="input-field" style={{ paddingRight: '2rem', appearance: 'none' }}
            value={(val as string) || ''}
            onChange={e => setParams({ ...params, [param.name]: e.target.value })}>
            <option value="">— Choisir —</option>
            {param.dropdown_options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>
      )
    }
    if (param.param_type === 'date')
      return <input type="date" className="input-field" value={(val as string) || ''} onChange={e => setParams({ ...params, [param.name]: e.target.value })} />
    if (param.param_type === 'number')
      return <input type="number" className="input-field" placeholder="0" value={(val as string) || ''} onChange={e => setParams({ ...params, [param.name]: e.target.value })} />
    return <input type="text" className="input-field" placeholder={`Entrez ${param.label}…`} value={(val as string) || ''} onChange={e => setParams({ ...params, [param.name]: e.target.value })} />
  }

  /* ── Render ── */
  return (
    <div style={{ padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header + search */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Mes rapports</h1>
          <p className="page-sub">Consultez et exécutez vos rapports disponibles</p>
        </div>
        <div style={{ position: 'relative', width: 300 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-field" style={{ paddingLeft: 32 }}
            placeholder="Rechercher un rapport…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Body: grid or split view */}
      {!selected ? (
        /* ── Report grid ── */
        loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Loader2 size={28} style={{ color: 'var(--brand)', animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>Aucun rapport disponible</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', alignContent: 'start' }}>
            {filtered.map(report => (
              <div key={report.id}
                className="card card-hover"
                style={{ cursor: 'pointer' }}
                onClick={() => openReport(report)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={18} style={{ color: 'var(--brand)' }} />
                  </div>
                  {report.is_public
                    ? <span className="badge badge-green"><Globe size={10} />Public</span>
                    : <span className="badge badge-slate"><Lock size={10} />Privé</span>
                  }
                </div>
                <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0 0 0.375rem' }}>
                  {report.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.875rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {report.description || 'Aucune description'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge badge-blue">{report.parameters.length} param.</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--brand)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Play size={12} />Ouvrir
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ── Split view: form left · preview right ── */
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.25rem', flex: 1, minHeight: 0 }}>

          {/* ── Left: form panel ── */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {/* Form header */}
            <div style={{
              padding: '0.875rem 1rem',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '0.95rem', margin: 0, color: 'var(--text-primary)' }}>
                  {selected.name}
                </p>
                {selected.description && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0', lineHeight: 1.4 }}>
                    {selected.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setSelected(null); clearPreview() }}
                style={iconBtn}
                title="Fermer"
              ><X size={16} /></button>
            </div>

            {/* Form body */}
            <div className="scroll-thin" style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.625rem 0.75rem', fontSize: '0.875rem', color: '#dc2626' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />{error}
                </div>
              )}

              {selected.parameters.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', margin: '0.5rem 0' }}>
                  Aucun paramètre requis
                </p>
              )}

              {[...selected.parameters]
                .sort((a, b) => a.display_order - b.display_order)
                .map(param => (
                  <div key={param.id}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {param.label}
                      {param.is_required && <span style={{ color: '#dc2626' }}>*</span>}
                      {param.param_type === 'multiselect' && (
                        <span className="badge badge-purple" style={{ marginLeft: 4 }}>multi</span>
                      )}
                    </label>
                    {renderParam(param)}
                  </div>
                ))}
            </div>

            {/* Form footer */}
            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-surface-2)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              {/* Preview button */}
              <button
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={previewing || executing}
                onClick={handlePreview}
              >
                {previewing
                  ? <><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />Génération de l'aperçu…</>
                  : <><Eye size={14} />Aperçu HTML</>
                }
              </button>

              {/* Export row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {EXPORT_FORMATS.map(fmt => {
                    const isDisabled = executing || previewing || !previewUrl
                    return (
                      <button
                        key={fmt.value}
                        disabled={isDisabled}
                        onClick={() => handleExport(fmt.value)}
                        title={!previewUrl ? 'Lancez d\'abord un aperçu' : `Exporter en ${fmt.label}`}
                        style={{
                          ...exportBtn,
                          flex: 1,
                          justifyContent: 'center',
                          background: isDisabled ? 'var(--bg-surface-3)' : 'var(--brand)',
                          color: isDisabled ? 'var(--text-muted)' : '#fff',
                          border: `1.5px solid ${isDisabled ? 'var(--border)' : 'var(--brand)'}`,
                          opacity: isDisabled ? 0.6 : 1,
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          padding: '0.42rem 0',
                        }}
                      >
                        {executing
                          ? <Loader2 size={12} style={{ animation: 'spin 0.7s linear infinite' }} />
                          : <Download size={12} />
                        }
                        {fmt.label}
                      </button>
                    )
                  })}
                </div>
                {!previewUrl && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                    Lancez un aperçu pour activer l'export
                  </p>
                )}
              </div>

              {/* Refresh preview link (visible only when preview exists) */}
              {previewUrl && (
                <button
                  style={{ ...iconBtn, fontSize: '0.75rem', color: 'var(--text-muted)', justifyContent: 'center', gap: 5, width: '100%' }}
                  onClick={handlePreview}
                  disabled={previewing}
                >
                  <RefreshCw size={11} />Actualiser l'aperçu
                </button>
              )}
            </div>
          </div>

          {/* ── Right: preview panel ── */}
          <PreviewPane
            previewUrl={previewUrl}
            previewError={previewError}
            previewing={previewing}
            format={outputFormat}
            reportName={selected.name}
            onDownload={handleExport}
            onClose={clearPreview}
          />
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
