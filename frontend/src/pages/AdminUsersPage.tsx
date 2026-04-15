import { useState, useEffect } from 'react'
import { Plus, Edit2, X, Save, UserCheck, UserX, ShieldCheck, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../utils/api'
import { User, Role } from '../types'

function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  return (
    <div className={`toast ${type==='success'?'toast-success':'toast-error'}`} onClick={onClose} style={{ cursor:'pointer' }}>
      {type==='success'?<CheckCircle size={16}/>:<AlertCircle size={16}/>}{msg}
    </div>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<User[]>([])
  const [roles, setRoles]   = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ username:'', email:'', password:'', role_id:0 })
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<{ msg:string; type:'success'|'error' }|null>(null)

  const fetchData = async () => {
    const [uRes, rRes] = await Promise.all([api.get('/users/'), api.get('/roles/')])
    setUsers(uRes.data); setRoles(rRes.data)
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const showToast = (msg:string, type:'success'|'error'='success') => {
    setToast({msg,type}); setTimeout(()=>setToast(null), 3500)
  }

  const defaultRoleId = () => roles.find(r=>r.name==='utilisateur')?.id || roles[0]?.id || 0

  const openCreate = () => {
    setEditing(null)
    setForm({ username:'', email:'', password:'', role_id: defaultRoleId() })
    setFormError(''); setModalOpen(true)
  }
  const openEdit = (u: User) => {
    setEditing(u)
    setForm({ username:u.username, email:u.email, password:'', role_id:u.role?.id || defaultRoleId() })
    setFormError(''); setModalOpen(true)
  }
  const save = async () => {
    setFormError('')
    try {
      const payload = editing
        ? { username:form.username, email:form.email, role_id:form.role_id, ...(form.password?{password:form.password}:{}) }
        : form
      if (editing) { await api.put(`/users/${editing.id}`, payload); showToast('Utilisateur mis à jour') }
      else         { await api.post('/users/', payload);               showToast('Utilisateur créé') }
      setModalOpen(false); fetchData()
    } catch (err:any) { setFormError(err.response?.data?.error || 'Erreur lors de la sauvegarde') }
  }
  const toggleStatus = async (u: User) => {
    await api.patch(`/users/${u.id}/toggle-status`)
    fetchData()
    showToast(u.is_active ? 'Utilisateur désactivé' : 'Utilisateur activé')
  }

  const stats = {
    total: users.length,
    active: users.filter(u=>u.is_active).length,
    admins: users.filter(u=>u.role?.name==='admin').length,
  }

  return (
    <div style={{ padding:'1.5rem', maxWidth:1100, margin:'0 auto' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-sub">Gestion des comptes utilisateurs</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15}/>Nouvel utilisateur
        </button>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.875rem', marginBottom:'1.25rem' }}>
        {[
          { label:'Total utilisateurs', value:stats.total, color:'var(--text-primary)' },
          { label:'Comptes actifs', value:stats.active, color:'#15803d' },
          { label:'Administrateurs', value:stats.admins, color:'var(--brand)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'Outfit', fontSize:'2rem', fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
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
                {['Utilisateur','E-mail','Rôle','Statut','Dernière connexion','Actions'].map(h=>(
                  <th key={h} className="th">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="td">
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--brand-light)', border:'2px solid var(--brand)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <span style={{ color:'var(--brand)', fontSize:'0.72rem', fontWeight:800, textTransform:'uppercase' }}>{u.username[0]}</span>
                      </div>
                      <span style={{ fontWeight:600, fontSize:'0.875rem', color:'var(--text-primary)' }}>{u.username}</span>
                    </div>
                  </td>
                  <td className="td" style={{ color:'var(--text-muted)' }}>{u.email}</td>
                  <td className="td">
                    {u.role?.name === 'admin'
                      ? <span className="badge badge-amber"><ShieldCheck size={11}/>Admin</span>
                      : <span className="badge badge-blue">{u.role?.name||'—'}</span>
                    }
                  </td>
                  <td className="td">
                    {u.is_active ? <span className="badge badge-green">Actif</span> : <span className="badge badge-red">Inactif</span>}
                  </td>
                  <td className="td" style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                  </td>
                  <td className="td">
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => openEdit(u)} style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:6, color:'var(--text-muted)', display:'flex' }}>
                        <Edit2 size={14}/>
                      </button>
                      <button onClick={() => toggleStatus(u)} title={u.is_active?'Désactiver':'Activer'}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:6, color:'var(--text-muted)', display:'flex' }}>
                        {u.is_active ? <UserX size={14}/> : <UserCheck size={14}/>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily:'Outfit', fontWeight:700, margin:0, color:'var(--text-primary)' }}>
                {editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {formError && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'#dc2626' }}>
                  <AlertCircle size={14} style={{ flexShrink:0 }}/>{formError}
                </div>
              )}
              {[
                { key:'username', label:"Nom d'utilisateur", type:'text' },
                { key:'email',    label:'Adresse e-mail',    type:'email' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>{f.label}</label>
                  <input type={f.type} className="input-field"
                    value={form[f.key as 'username'|'email']}
                    onChange={e => setForm({...form,[f.key]:e.target.value})} />
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                  {editing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
                </label>
                <input type="password" className="input-field"
                  value={form.password} onChange={e => setForm({...form,password:e.target.value})}
                  required={!editing} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Rôle</label>
                <div style={{ position:'relative' }}>
                  <select className="input-field" style={{ appearance:'none', paddingRight:28 }}
                    value={form.role_id} onChange={e => setForm({...form,role_id:parseInt(e.target.value)})}>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <svg style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:'var(--text-muted)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Annuler</button>
              <button className="btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={save}>
                <Save size={15}/>{editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
