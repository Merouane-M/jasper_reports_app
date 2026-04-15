import { useState, useEffect } from 'react'
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Globe, Lock,
  X, Save, ChevronDown, Users, ShieldCheck,
  AlertCircle, CheckCircle, Loader2
} from 'lucide-react'
import api from '../utils/api'
import { Report, ReportParameter, User, UserReportAccess, RoleReportAccess, Role } from '../types'

type ParamDraft = Omit<ReportParameter, 'id' | 'report_id'>
const EMPTY_PARAM: ParamDraft = { name:'', label:'', param_type:'text', is_required:false, default_value:null, dropdown_options:[], display_order:0 }

function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  return (
    <div className={`toast ${type === 'success' ? 'toast-success' : 'toast-error'}`}
      style={{ cursor:'pointer' }} onClick={onClose}>
      {type==='success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
      {msg}
    </div>
  )
}

export default function AdminReportsPage() {
  const [reports, setReports]   = useState<Report[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<Report | null>(null)
  const [accessReport, setAccessReport] = useState<Report | null>(null)
  const [accessTab, setAccessTab] = useState<'users'|'roles'>('users')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [userAccesses, setUserAccesses]   = useState<UserReportAccess[]>([])
  const [roleAccesses, setRoleAccesses]   = useState<RoleReportAccess[]>([])
  const [toast, setToast] = useState<{ msg:string; type:'success'|'error' } | null>(null)

  const [form, setForm] = useState({
    name:'', description:'', jasper_url:'', http_method:'GET',
    is_public:false, is_visible:true, ignore_pagination:false,
    parameters: [] as ParamDraft[]
  })

  const fetchReports = () => api.get('/admin/reports').then(r => setReports(r.data)).finally(() => setLoading(false))
  useEffect(() => { fetchReports() }, [])

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ name:'', description:'', jasper_url:'', http_method:'GET', is_public:false, is_visible:true, ignore_pagination:false, parameters:[] })
    setModalOpen(true)
  }
  const openEdit = (r: Report) => {
    setEditing(r)
    setForm({
      name:r.name, description:r.description||'', jasper_url:r.jasper_url, http_method:r.http_method,
      is_public:r.is_public, is_visible:r.is_visible, ignore_pagination:r.ignore_pagination,
      parameters: r.parameters.map(p => ({ name:p.name, label:p.label, param_type:p.param_type, is_required:p.is_required, default_value:p.default_value, dropdown_options:p.dropdown_options, display_order:p.display_order }))
    })
    setModalOpen(true)
  }
  const saveReport = async () => {
    try {
      if (editing) { await api.put(`/admin/reports/${editing.id}`, form); showToast('Rapport mis à jour') }
      else         { await api.post('/admin/reports', form);                showToast('Rapport créé') }
      setModalOpen(false); fetchReports()
    } catch (err: any) { showToast(err.response?.data?.error || 'Erreur lors de la sauvegarde', 'error') }
  }
  const deleteReport = async (id: number, name: string) => {
    if (!confirm(`Supprimer « ${name} » ?`)) return
    try { await api.delete(`/admin/reports/${id}`); showToast('Rapport supprimé'); fetchReports() }
    catch { showToast('Erreur lors de la suppression', 'error') }
  }
  const toggleVis = async (id: number) => { await api.patch(`/admin/reports/${id}/toggle-visibility`); fetchReports() }

  const openAccess = async (report: Report) => {
    setAccessReport(report); setAccessTab('users')
    const [uRes, rRes, uaRes, raRes] = await Promise.all([
      api.get('/users/'), api.get('/roles/'),
      api.get(`/admin/reports/${report.id}/access/users`),
      api.get(`/admin/reports/${report.id}/access/roles`),
    ])
    setAllUsers(uRes.data.filter((u: User) => u.role?.name !== 'admin'))
    setAllRoles(rRes.data.filter((r: Role) => r.name !== 'admin'))
    setUserAccesses(uaRes.data)
    setRoleAccesses(raRes.data)
  }
  const refreshAccess = async (reportId: number) => {
    const [uaRes, raRes] = await Promise.all([
      api.get(`/admin/reports/${reportId}/access/users`),
      api.get(`/admin/reports/${reportId}/access/roles`),
    ])
    setUserAccesses(uaRes.data); setRoleAccesses(raRes.data)
  }
  const grantUser = async (userId: number) => {
    if (!accessReport) return
    await api.post(`/admin/reports/${accessReport.id}/access/users`, { user_id: userId })
    await refreshAccess(accessReport.id)
  }
  const revokeUser = async (userId: number) => {
    if (!accessReport) return
    await api.delete(`/admin/reports/${accessReport.id}/access/users/${userId}`)
    await refreshAccess(accessReport.id)
  }
  const grantRole = async (roleId: number) => {
    if (!accessReport) return
    await api.post(`/admin/reports/${accessReport.id}/access/roles`, { role_id: roleId })
    await refreshAccess(accessReport.id)
  }
  const revokeRole = async (roleId: number) => {
    if (!accessReport) return
    await api.delete(`/admin/reports/${accessReport.id}/access/roles/${roleId}`)
    await refreshAccess(accessReport.id)
  }

  const addParam = () => setForm(f => ({ ...f, parameters:[...f.parameters, {...EMPTY_PARAM}] }))
  const removeParam = (i:number) => setForm(f => ({ ...f, parameters:f.parameters.filter((_,idx)=>idx!==i) }))
  const updateParam = (i:number, key:string, val:unknown) =>
    setForm(f => ({ ...f, parameters:f.parameters.map((p,idx) => idx===i ? {...p,[key]:val} : p) }))

  const hasDropdown = (type: string) => type === 'dropdown' || type === 'multiselect'
  const PARAM_TYPES = [
    { value:'text', label:'Texte' }, { value:'number', label:'Nombre' },
    { value:'date', label:'Date' }, { value:'dropdown', label:'Liste déroulante (simple)' },
    { value:'multiselect', label:'Liste déroulante (multiple)' },
  ]

  const S: React.CSSProperties = { fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', display:'block', marginBottom:6 }
  const Checkbox = ({ label, checked, onChange }: { label:string; checked:boolean; onChange:(v:boolean)=>void }) => (
    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'0.875rem', color:'var(--text-secondary)' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ width:15, height:15, accentColor:'var(--brand)', cursor:'pointer' }} />
      {label}
    </label>
  )

  return (
    <div style={{ padding:'1.5rem', maxWidth:1200, margin:'0 auto' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div>
          <h1 className="page-title">Gérer les rapports</h1>
          <p className="page-sub">Création, modification et contrôle d'accès des rapports</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15} />Nouveau rapport
        </button>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
          <Loader2 size={28} style={{ color:'var(--brand)', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Nom / Description','URL Jasper','Paramètres','Options','Accès','Actions'].map(h => (
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td className="td">
                    <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:'0.875rem' }}>{r.name}</div>
                    <div style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginTop:2, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.description}</div>
                  </td>
                  <td className="td">
                    <code style={{ fontSize:'0.72rem', background:'var(--bg-surface-2)', color:'var(--brand)', padding:'2px 6px', borderRadius:4, fontFamily:'JetBrains Mono' }}>
                      {r.jasper_url}
                    </code>
                  </td>
                  <td className="td"><span className="badge badge-blue">{r.parameters.length}</span></td>
                  <td className="td">
                    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                      {r.is_visible ? <span className="badge badge-green"><Eye size={10}/>Visible</span> : <span className="badge badge-slate"><EyeOff size={10}/>Masqué</span>}
                      {r.is_public  ? <span className="badge badge-blue"><Globe size={10}/>Public</span>  : <span className="badge badge-slate"><Lock size={10}/>Privé</span>}
                      {r.ignore_pagination && <span className="badge badge-amber">Sans pagination</span>}
                    </div>
                  </td>
                  <td className="td">
                    <button className="btn-secondary" style={{ padding:'0.35rem 0.625rem', fontSize:'0.75rem' }} onClick={() => openAccess(r)}>
                      <Users size={13}/>Accès
                    </button>
                  </td>
                  <td className="td">
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => toggleVis(r.id)} title="Basculer visibilité"
                        style={{ background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:5, color:'var(--text-muted)', display:'flex' }}>
                        {r.is_visible ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                      <button onClick={() => openEdit(r)}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:5, color:'var(--text-muted)', display:'flex' }}>
                        <Edit2 size={15}/>
                      </button>
                      <button onClick={() => deleteReport(r.id, r.name)}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:5, color:'var(--text-muted)', display:'flex' }}
                        onMouseEnter={e => (e.currentTarget.style.color='#dc2626')}
                        onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}>
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:'3rem', color:'var(--text-muted)' }}>
                  Aucun rapport. Créez votre premier rapport.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily:'Outfit', fontWeight:700, margin:0, color:'var(--text-primary)' }}>
                {editing ? 'Modifier le rapport' : 'Nouveau rapport'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={18}/></button>
            </div>

            <div className="modal-body scroll-thin" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {/* Basic fields */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>Nom du rapport *</label>
                  <input className="input-field" value={form.name} onChange={e => setForm({...form,name:e.target.value})} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>Description</label>
                  <textarea className="input-field" rows={2} style={{ resize:'none' }} value={form.description} onChange={e => setForm({...form,description:e.target.value})} />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>URL du rapport Jasper *</label>
                  <input className="input-field" style={{ fontFamily:'JetBrains Mono', fontSize:'0.8rem' }}
                    placeholder="/reports/samples/ventes_mensuelles"
                    value={form.jasper_url} onChange={e => setForm({...form,jasper_url:e.target.value})} />
                </div>
                <div>
                  <label style={S}>Méthode HTTP</label>
                  <div style={{ position:'relative' }}>
                    <select className="input-field" style={{ appearance:'none', paddingRight:28 }}
                      value={form.http_method} onChange={e => setForm({...form,http_method:e.target.value})}>
                      <option>GET</option><option>POST</option>
                    </select>
                    <ChevronDown size={13} style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:8, paddingBottom:2 }}>
                  <Checkbox label="Rapport public" checked={form.is_public} onChange={v => setForm({...form,is_public:v})} />
                  <Checkbox label="Visible" checked={form.is_visible} onChange={v => setForm({...form,is_visible:v})} />
                  <Checkbox label="Ignorer la pagination" checked={form.ignore_pagination} onChange={v => setForm({...form,ignore_pagination:v})} />
                </div>
              </div>

              {/* Parameters */}
              <div style={{ borderTop:'1px solid var(--border)', paddingTop:'1rem' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.75rem' }}>
                  <h3 style={{ fontFamily:'Outfit', fontWeight:600, margin:0, fontSize:'0.95rem', color:'var(--text-primary)' }}>
                    Paramètres
                  </h3>
                  <button className="btn-secondary" style={{ padding:'0.35rem 0.625rem', fontSize:'0.75rem' }} onClick={addParam}>
                    <Plus size={13}/>Ajouter
                  </button>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
                  {form.parameters.map((p, i) => (
                    <div key={i} style={{ background:'var(--bg-surface-2)', borderRadius:10, padding:'0.75rem', border:'1px solid var(--border)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.625rem' }}>
                        <span style={{ fontSize:'0.72rem', fontFamily:'JetBrains Mono', color:'var(--text-muted)' }}>paramètre #{i+1}</span>
                        <button onClick={() => removeParam(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:0 }}
                          onMouseEnter={e=>(e.currentTarget.style.color='#dc2626')} onMouseLeave={e=>(e.currentTarget.style.color='var(--text-muted)')}>
                          <X size={14}/>
                        </button>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                        <input className="input-field" style={{ fontSize:'0.8rem', padding:'0.4rem 0.625rem' }} placeholder="Clé API (ex: dateDebut)" value={p.name} onChange={e => updateParam(i,'name',e.target.value)} />
                        <input className="input-field" style={{ fontSize:'0.8rem', padding:'0.4rem 0.625rem' }} placeholder="Libellé affiché" value={p.label} onChange={e => updateParam(i,'label',e.target.value)} />
                        <div style={{ position:'relative' }}>
                          <select className="input-field" style={{ fontSize:'0.8rem', padding:'0.4rem 0.625rem', appearance:'none', paddingRight:24 }}
                            value={p.param_type} onChange={e => updateParam(i,'param_type',e.target.value)}>
                            {PARAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                          <ChevronDown size={12} style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
                        </div>
                        <input className="input-field" style={{ fontSize:'0.8rem', padding:'0.4rem 0.625rem' }} placeholder="Valeur par défaut" value={p.default_value||''} onChange={e => updateParam(i,'default_value',e.target.value||null)} />
                      </div>
                      {hasDropdown(p.param_type) && (
                        <div style={{ marginTop:'0.5rem' }}>
                          <input className="input-field" style={{ fontSize:'0.8rem', padding:'0.4rem 0.625rem' }}
                            placeholder="Options séparées par des virgules (ex: Paris, Lyon, Marseille)"
                            value={p.dropdown_options.join(', ')}
                            onChange={e => updateParam(i,'dropdown_options', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
                        </div>
                      )}
                      <div style={{ marginTop:'0.5rem' }}>
                        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.8rem', color:'var(--text-muted)' }}>
                          <input type="checkbox" checked={p.is_required} onChange={e => updateParam(i,'is_required',e.target.checked)}
                            style={{ width:13, height:13, accentColor:'var(--brand)', cursor:'pointer' }} />
                          Champ obligatoire
                        </label>
                      </div>
                    </div>
                  ))}
                  {form.parameters.length === 0 && (
                    <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem', padding:'0.75rem' }}>
                      Aucun paramètre — cliquez sur « Ajouter » pour en créer un.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Annuler</button>
              <button className="btn-primary"   style={{ flex:1, justifyContent:'center' }} onClick={saveReport}>
                <Save size={15}/>{editing ? 'Enregistrer' : 'Créer le rapport'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCESS MODAL ── */}
      {accessReport && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:500 }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontFamily:'Outfit', fontWeight:700, margin:0, color:'var(--text-primary)' }}>Contrôle d'accès</h2>
                <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', margin:'0.2rem 0 0' }}>{accessReport.name}</p>
              </div>
              <button onClick={() => setAccessReport(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={18}/></button>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', paddingLeft:'1rem' }}>
              {([['users','Utilisateurs',<Users size={14}/>],['roles','Rôles',<ShieldCheck size={14}/>]] as const).map(([tab, label, icon]) => (
                <button key={tab} onClick={() => setAccessTab(tab as 'users'|'roles')} style={{
                  background:'none', border:'none', cursor:'pointer',
                  padding:'0.625rem 0.875rem', fontSize:'0.85rem', fontWeight:600,
                  display:'flex', alignItems:'center', gap:6,
                  color: accessTab===tab ? 'var(--brand)' : 'var(--text-muted)',
                  borderBottom: accessTab===tab ? '2px solid var(--brand)' : '2px solid transparent',
                  marginBottom:-1, transition:'all 0.15s'
                }}>
                  {icon}{label}
                </button>
              ))}
            </div>

            <div className="modal-body scroll-thin" style={{ maxHeight:340 }}>
              {accessTab === 'users' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {allUsers.map(u => {
                    const has = userAccesses.some(a => a.user_id === u.id)
                    return (
                      <div key={u.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-surface-2)', borderRadius:8, padding:'0.625rem 0.75rem' }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{u.username}</div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{u.email} · {u.role?.name}</div>
                        </div>
                        <button className={has ? 'btn-danger' : 'btn-primary'} style={{ padding:'0.35rem 0.75rem', fontSize:'0.75rem' }}
                          onClick={() => has ? revokeUser(u.id) : grantUser(u.id)}>
                          {has ? 'Révoquer' : 'Accorder'}
                        </button>
                      </div>
                    )
                  })}
                  {allUsers.length===0 && <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem' }}>Aucun utilisateur</p>}
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                  {allRoles.map(r => {
                    const has = roleAccesses.some(a => a.role_id === r.id)
                    return (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-surface-2)', borderRadius:8, padding:'0.625rem 0.75rem' }}>
                        <div>
                          <div style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{r.name}</div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>{r.description || '—'}</div>
                        </div>
                        <button className={has ? 'btn-danger' : 'btn-primary'} style={{ padding:'0.35rem 0.75rem', fontSize:'0.75rem' }}
                          onClick={() => has ? revokeRole(r.id) : grantRole(r.id)}>
                          {has ? 'Révoquer' : 'Accorder'}
                        </button>
                      </div>
                    )
                  })}
                  {allRoles.length===0 && <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.875rem' }}>Aucun rôle disponible</p>}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={() => setAccessReport(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
