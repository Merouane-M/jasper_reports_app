import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Save, ShieldCheck, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import api from '../utils/api'
import { Role } from '../types'

function Toast({ msg, type, onClose }: { msg:string; type:'success'|'error'; onClose:()=>void }) {
  return (
    <div className={`toast ${type==='success'?'toast-success':'toast-error'}`} onClick={onClose} style={{ cursor:'pointer' }}>
      {type==='success'?<CheckCircle size={16}/>:<AlertCircle size={16}/>}{msg}
    </div>
  )
}

export default function AdminRolesPage() {
  const [roles, setRoles]   = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [form, setForm] = useState({ name:'', description:'' })
  const [toast, setToast] = useState<{ msg:string; type:'success'|'error' } | null>(null)
  const [error, setError] = useState('')

  const fetchRoles = () => api.get('/roles/').then(r => setRoles(r.data)).finally(() => setLoading(false))
  useEffect(() => { fetchRoles() }, [])

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3500)
  }

  const openCreate = () => { setEditing(null); setForm({ name:'', description:'' }); setError(''); setModalOpen(true) }
  const openEdit   = (r: Role) => { setEditing(r); setForm({ name:r.name, description:r.description||'' }); setError(''); setModalOpen(true) }

  const save = async () => {
    setError('')
    try {
      if (editing) { await api.put(`/roles/${editing.id}`, form); showToast('Rôle modifié') }
      else         { await api.post('/roles/', form);              showToast('Rôle créé') }
      setModalOpen(false); fetchRoles()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    }
  }

  const deleteRole = async (r: Role) => {
    if (!confirm(`Supprimer le rôle « ${r.name} » ?`)) return
    try { await api.delete(`/roles/${r.id}`); showToast('Rôle supprimé'); fetchRoles() }
    catch (err: any) { showToast(err.response?.data?.error || 'Erreur lors de la suppression', 'error') }
  }

  return (
    <div style={{ padding:'1.5rem', maxWidth:900, margin:'0 auto' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div>
          <h1 className="page-title">Gestion des rôles</h1>
          <p className="page-sub">Créez et gérez les rôles pour contrôler l'accès aux rapports</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={15}/>Nouveau rôle
        </button>
      </div>

      {/* Info box */}
      <div style={{ background:'var(--brand-light)', border:'1px solid var(--brand)', borderRadius:10, padding:'0.75rem 1rem', marginBottom:'1.25rem', display:'flex', gap:10, alignItems:'flex-start' }}>
        <ShieldCheck size={16} style={{ color:'var(--brand)', flexShrink:0, marginTop:2 }} />
        <p style={{ fontSize:'0.82rem', color:'var(--brand)', margin:0, lineHeight:1.5 }}>
          Les rôles permettent de définir des groupes d'accès. Vous pouvez ensuite accorder l'accès à des rapports entiers à un rôle depuis la gestion des rapports.
          Les rôles système (<strong>admin</strong>, <strong>utilisateur</strong>) ne peuvent pas être modifiés.
        </p>
      </div>

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
          <Loader2 size={28} style={{ color:'var(--brand)', animation:'spin 0.7s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:'0.875rem' }}>
          {roles.map(r => (
            <div key={r.id} className="card" style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:'var(--brand-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <ShieldCheck size={16} style={{ color:'var(--brand)' }} />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)' }}>{r.name}</div>
                    {r.is_system && <span className="badge badge-amber" style={{ marginTop:2 }}>Système</span>}
                  </div>
                </div>
                {!r.is_system && (
                  <div style={{ display:'flex', gap:4 }}>
                    <button onClick={() => openEdit(r)} style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:6, color:'var(--text-muted)', display:'flex' }}>
                      <Edit2 size={14}/>
                    </button>
                    <button onClick={() => deleteRole(r)} style={{ background:'none', border:'none', cursor:'pointer', padding:5, borderRadius:6, color:'var(--text-muted)', display:'flex' }}
                      onMouseEnter={e=>(e.currentTarget.style.color='#dc2626')} onMouseLeave={e=>(e.currentTarget.style.color='var(--text-muted)')}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                )}
              </div>
              <p style={{ fontSize:'0.8rem', color:'var(--text-muted)', margin:0, lineHeight:1.5 }}>
                {r.description || <em>Aucune description</em>}
              </p>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', borderTop:'1px solid var(--border)', paddingTop:'0.5rem' }}>
                ID : {r.id}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth:440 }}>
            <div className="modal-header">
              <h2 style={{ fontFamily:'Outfit', fontWeight:700, margin:0, color:'var(--text-primary)' }}>
                {editing ? 'Modifier le rôle' : 'Nouveau rôle'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:4 }}><X size={18}/></button>
            </div>
            <div className="modal-body" style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'#dc2626' }}>
                  <AlertCircle size={14} style={{ flexShrink:0 }}/>{error}
                </div>
              )}
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Nom du rôle *</label>
                <input className="input-field" placeholder="ex: comptabilite, direction" value={form.name} onChange={e => setForm({...form,name:e.target.value})} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>Description</label>
                <textarea className="input-field" rows={3} style={{ resize:'none' }} placeholder="Description optionnelle du rôle…" value={form.description} onChange={e => setForm({...form,description:e.target.value})} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" style={{ flex:1, justifyContent:'center' }} onClick={() => setModalOpen(false)}>Annuler</button>
              <button className="btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={save}>
                <Save size={15}/>{editing ? 'Enregistrer' : 'Créer le rôle'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
