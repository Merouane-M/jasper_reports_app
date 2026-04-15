import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Filter, Download, ChevronLeft, ChevronRight,
  X, Search, FileText, FileSpreadsheet, Code2, Loader2,
  ChevronDown, Eye, BarChart3
} from 'lucide-react'
import api from '../utils/api'
import { AuditLog, PaginatedAuditLogs, AuditStats, User } from '../types'

const ACTION_BADGE: Record<string, string> = {
  CREATE_REPORT:'badge-green', UPDATE_REPORT:'badge-blue', DELETE_REPORT:'badge-red',
  TOGGLE_VISIBILITY:'badge-amber', TOGGLE_PUBLIC:'badge-amber',
  CREATE_USER:'badge-green', UPDATE_USER:'badge-blue',
  DEACTIVATE_USER:'badge-red', ACTIVATE_USER:'badge-green',
  CHANGE_ROLE:'badge-amber', PASSWORD_CHANGED:'badge-purple',
  GRANT_ACCESS:'badge-green', REVOKE_ACCESS:'badge-red',
  GRANT_ROLE_ACCESS:'badge-green', REVOKE_ROLE_ACCESS:'badge-red',
  LOGIN_SUCCESS:'badge-blue', LOGIN_FAILED:'badge-red',
  CREATE_ROLE:'badge-green', UPDATE_ROLE:'badge-blue', DELETE_ROLE:'badge-red',
}

const ACTION_FR: Record<string, string> = {
  CREATE_REPORT:'Créer rapport', UPDATE_REPORT:'Modifier rapport', DELETE_REPORT:'Supprimer rapport',
  TOGGLE_VISIBILITY:'Basculer visibilité', TOGGLE_PUBLIC:'Basculer accès',
  CREATE_USER:'Créer utilisateur', UPDATE_USER:'Modifier utilisateur',
  DEACTIVATE_USER:'Désactiver utilisateur', ACTIVATE_USER:'Activer utilisateur',
  CHANGE_ROLE:'Changer rôle', PASSWORD_CHANGED:'Mot de passe modifié',
  GRANT_ACCESS:'Accorder accès', REVOKE_ACCESS:'Révoquer accès',
  GRANT_ROLE_ACCESS:'Accorder accès (rôle)', REVOKE_ROLE_ACCESS:'Révoquer accès (rôle)',
  LOGIN_SUCCESS:'Connexion réussie', LOGIN_FAILED:'Connexion échouée',
  CREATE_ROLE:'Créer rôle', UPDATE_ROLE:'Modifier rôle', DELETE_ROLE:'Supprimer rôle',
}

export default function AuditLogsPage() {
  const [data,    setData]    = useState<PaginatedAuditLogs|null>(null)
  const [stats,   setStats]   = useState<AuditStats|null>(null)
  const [users,   setUsers]   = useState<User[]>([])
  const [actionTypes, setActionTypes] = useState<string[]>([])
  const [entityTypes, setEntityTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLog, setDetailLog] = useState<AuditLog|null>(null)

  const [filters, setFilters] = useState({
    page:1, per_page:20, search:'',
    admin_user_id:'', action_type:'', entity_type:'',
    date_from:'', date_to:'',
  })

  const buildParams = useCallback(() => {
    const p: Record<string,string> = { page:String(filters.page), per_page:String(filters.per_page) }
    if (filters.search)       p.search        = filters.search
    if (filters.admin_user_id) p.admin_user_id = filters.admin_user_id
    if (filters.action_type)  p.action_type   = filters.action_type
    if (filters.entity_type)  p.entity_type   = filters.entity_type
    if (filters.date_from)    p.date_from      = filters.date_from
    if (filters.date_to)      p.date_to        = filters.date_to
    return new URLSearchParams(p).toString()
  }, [filters])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get(`/audit/?${buildParams()}`); setData(r.data) }
    finally { setLoading(false) }
  }, [buildParams])

  useEffect(() => { fetchLogs() }, [fetchLogs])
  useEffect(() => {
    api.get('/audit/stats').then(r=>setStats(r.data))
    api.get('/users/').then(r=>setUsers(r.data))
    api.get('/audit/action-types').then(r=>setActionTypes(r.data))
    api.get('/audit/entity-types').then(r=>setEntityTypes(r.data))
  }, [])

  const exportLogs = async (fmt:'csv'|'json'|'xlsx') => {
    const r = await api.get(`/audit/export/${fmt}?${buildParams()}`, { responseType:'blob' })
    const url = URL.createObjectURL(new Blob([r.data]))
    const a = document.createElement('a'); a.href=url; a.download=`journal_audit.${fmt}`; a.click()
    URL.revokeObjectURL(url)
  }

  const fmtDate = (ts:string) => new Date(ts).toLocaleString('fr-FR', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  })

  const S_label: React.CSSProperties = { display:'block', fontSize:'0.72rem', fontWeight:600, color:'var(--text-muted)', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }

  return (
    <div style={{ padding:'1.5rem', maxWidth:1300, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:'0.75rem' }}>
        <div>
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Activity size={22} style={{ color:'var(--brand)' }} />Journal d'audit
          </h1>
          <p className="page-sub">Historique immuable de toutes les actions administratives</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Exporter :</span>
          {([['csv', <FileText size={14}/>, 'CSV'], ['xlsx', <FileSpreadsheet size={14}/>, 'Excel'], ['json', <Code2 size={14}/>, 'JSON']] as const).map(([fmt, icon, label]) => (
            <button key={fmt} className="btn-secondary" style={{ padding:'0.35rem 0.625rem', fontSize:'0.75rem' }} onClick={() => exportLogs(fmt)}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:'0.75rem', marginBottom:'1.25rem' }}>
          <div className="card" style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'Outfit', fontSize:'1.8rem', fontWeight:800, color:'var(--text-primary)' }}>{stats.total.toLocaleString('fr-FR')}</div>
            <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:4 }}>Événements total</div>
          </div>
          {stats.by_action.slice(0,3).map(a => (
            <div key={a.action} className="card">
              <div style={{ fontFamily:'Outfit', fontSize:'1.5rem', fontWeight:800, color:'var(--brand)' }}>{a.count}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:4, lineHeight:1.3 }}>
                {ACTION_FR[a.action] || a.action.replace(/_/g,' ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.75rem' }}>
          <Filter size={14} style={{ color:'var(--text-muted)' }} />
          <span style={{ fontSize:'0.85rem', fontWeight:600, color:'var(--text-secondary)' }}>Filtres</span>
          <button onClick={() => setFilters({ page:1,per_page:20,search:'',admin_user_id:'',action_type:'',entity_type:'',date_from:'',date_to:'' })}
            style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontSize:'0.75rem', color:'var(--text-muted)', textDecoration:'underline' }}>
            Réinitialiser
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr', gap:'0.625rem', alignItems:'end' }}>
          <div>
            <label style={S_label}>Recherche</label>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
              <input className="input-field" style={{ paddingLeft:28, fontSize:'0.82rem' }}
                placeholder="Rechercher…"
                value={filters.search} onChange={e => setFilters({...filters,search:e.target.value,page:1})} />
            </div>
          </div>
          {[
            { key:'admin_user_id', label:'Utilisateur', opts: users.map(u=>({v:String(u.id),l:u.username})) },
            { key:'action_type',   label:'Action',      opts: actionTypes.map(a=>({v:a,l:ACTION_FR[a]||a})) },
            { key:'entity_type',   label:'Entité',      opts: entityTypes.map(e=>({v:e,l:e})) },
          ].map(({ key, label, opts }) => (
            <div key={key}>
              <label style={S_label}>{label}</label>
              <div style={{ position:'relative' }}>
                <select className="input-field" style={{ appearance:'none', paddingRight:24, fontSize:'0.82rem' }}
                  value={filters[key as keyof typeof filters]}
                  onChange={e => setFilters({...filters,[key]:e.target.value,page:1})}>
                  <option value="">Tous</option>
                  {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <ChevronDown size={12} style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
              </div>
            </div>
          ))}
          <div>
            <label style={S_label}>Du</label>
            <input type="date" className="input-field" style={{ fontSize:'0.82rem' }}
              value={filters.date_from} onChange={e => setFilters({...filters,date_from:e.target.value,page:1})} />
          </div>
          <div>
            <label style={S_label}>Au</label>
            <input type="date" className="input-field" style={{ fontSize:'0.82rem' }}
              value={filters.date_to} onChange={e => setFilters({...filters,date_to:e.target.value,page:1})} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
            <Loader2 size={28} style={{ color:'var(--brand)', animation:'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:800 }}>
                <thead>
                  <tr>
                    {['Horodatage','Utilisateur','Action','Entité','Description','IP',''].map(h=>(
                      <th key={h} className="th">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.logs.map(log => (
                    <tr key={log.id}>
                      <td className="td" style={{ fontSize:'0.78rem', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
                        {fmtDate(log.timestamp)}
                      </td>
                      <td className="td">
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <span style={{ color:'var(--brand)', fontSize:'0.65rem', fontWeight:800, textTransform:'uppercase' }}>{log.admin_username?.[0]}</span>
                          </div>
                          <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--text-primary)' }}>{log.admin_username}</span>
                        </div>
                      </td>
                      <td className="td">
                        <span className={`badge ${ACTION_BADGE[log.action_type]||'badge-slate'}`} style={{ fontSize:'0.68rem' }}>
                          {ACTION_FR[log.action_type] || log.action_type}
                        </span>
                      </td>
                      <td className="td">
                        <div>
                          <span className="badge badge-slate" style={{ fontSize:'0.68rem' }}>{log.entity_type}</span>
                          {log.entity_name && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:3, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.entity_name}</div>}
                        </div>
                      </td>
                      <td className="td" style={{ fontSize:'0.8rem', color:'var(--text-secondary)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {log.description}
                      </td>
                      <td className="td" style={{ fontSize:'0.75rem', color:'var(--text-muted)', fontFamily:'JetBrains Mono' }}>
                        {log.ip_address}
                      </td>
                      <td className="td">
                        {(log.changes_before || log.changes_after) && (
                          <button onClick={() => setDetailLog(log)} style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:6, color:'var(--text-muted)', display:'flex' }}
                            onMouseEnter={e=>(e.currentTarget.style.color='var(--brand)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--text-muted)')}>
                            <Eye size={15}/>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!data?.logs.length && (
                    <tr><td colSpan={7} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
                      Aucune entrée trouvée
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.pages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem 1rem', borderTop:'1px solid var(--border)' }}>
                <span style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                  {((filters.page-1)*filters.per_page)+1}–{Math.min(filters.page*filters.per_page, data.total)} sur {data.total.toLocaleString('fr-FR')} entrées
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button className="btn-secondary" style={{ padding:'0.3rem 0.5rem' }}
                    disabled={filters.page<=1} onClick={()=>setFilters(f=>({...f,page:f.page-1}))}>
                    <ChevronLeft size={15}/>
                  </button>
                  <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>Page {filters.page} / {data.pages}</span>
                  <button className="btn-secondary" style={{ padding:'0.3rem 0.5rem' }}
                    disabled={filters.page>=data.pages} onClick={()=>setFilters(f=>({...f,page:f.page+1}))}>
                    <ChevronRight size={15}/>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {detailLog && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:540 }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily:'Outfit', fontWeight:700, margin:0, color:'var(--text-primary)' }}>Détail des changements</h2>
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', margin:'0.2rem 0 0' }}>
                  {ACTION_FR[detailLog.action_type] || detailLog.action_type} · {fmtDate(detailLog.timestamp)}
                </p>
              </div>
              <button onClick={() => setDetailLog(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={18}/></button>
            </div>
            <div className="modal-body scroll-thin" style={{ display:'flex', flexDirection:'column', gap:'1rem', maxHeight:400 }}>
              {detailLog.changes_before && (
                <div>
                  <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 6px' }}>Avant</p>
                  <pre style={{ background:'var(--bg-surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'0.75rem', fontSize:'0.75rem', color:'var(--text-secondary)', overflowX:'auto', margin:0, fontFamily:'JetBrains Mono', lineHeight:1.5 }}>
                    {JSON.stringify(detailLog.changes_before, null, 2)}
                  </pre>
                </div>
              )}
              {detailLog.changes_after && (
                <div>
                  <p style={{ fontSize:'0.72rem', fontWeight:700, color:'#15803d', textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 6px' }}>Après</p>
                  <pre style={{ background:'var(--bg-surface-2)', border:'1px solid var(--border)', borderRadius:8, padding:'0.75rem', fontSize:'0.75rem', color:'var(--text-secondary)', overflowX:'auto', margin:0, fontFamily:'JetBrains Mono', lineHeight:1.5 }}>
                    {JSON.stringify(detailLog.changes_after, null, 2)}
                  </pre>
                </div>
              )}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:'0.75rem', fontSize:'0.75rem', color:'var(--text-muted)', display:'flex', flexDirection:'column', gap:4 }}>
                <div>Navigateur : {detailLog.user_agent || '—'}</div>
                <div>ID entrée : #{detailLog.id}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
