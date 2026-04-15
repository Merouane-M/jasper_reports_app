import { useState, FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, CheckCircle, AlertCircle } from 'lucide-react'
import api from '../utils/api'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (form.new_password !== form.confirm) {
      setError('Les nouveaux mots de passe ne correspondent pas.')
      return
    }
    if (form.new_password.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setSuccess(true)
      setForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur lors de la modification du mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ label, value, onChange, show, onToggle }: {
    label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void
  }) => (
    <div>
      <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <input type={show ? 'text' : 'password'} className="input-field"
          style={{ paddingRight:'2.5rem' }}
          value={value} onChange={e => onChange(e.target.value)} required />
        <button type="button" onClick={onToggle} style={{
          position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
          background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
          display:'flex', padding:0
        }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding:'1.5rem', maxWidth:480, margin:'0 auto' }}>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <KeyRound size={22} style={{ color:'var(--brand)' }} />
          Modifier le mot de passe
        </h1>
        <p className="page-sub">Changez votre mot de passe de connexion</p>
      </div>

      <div className="card" style={{ maxWidth:420 }}>
        {error && (
          <div style={{
            display:'flex', alignItems:'center', gap:8, marginBottom:'1rem',
            background:'#fef2f2', border:'1px solid #fca5a5',
            borderRadius:8, padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'#dc2626'
          }}>
            <AlertCircle size={15} style={{ flexShrink:0 }} />{error}
          </div>
        )}
        {success && (
          <div style={{
            display:'flex', alignItems:'center', gap:8, marginBottom:'1rem',
            background:'#f0fdf4', border:'1px solid #bbf7d0',
            borderRadius:8, padding:'0.625rem 0.75rem', fontSize:'0.875rem', color:'#15803d'
          }}>
            <CheckCircle size={15} style={{ flexShrink:0 }} />Mot de passe modifié avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
          <Field
            label="Mot de passe actuel"
            value={form.current_password}
            onChange={v => setForm({ ...form, current_password: v })}
            show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)}
          />
          <Field
            label="Nouveau mot de passe"
            value={form.new_password}
            onChange={v => setForm({ ...form, new_password: v })}
            show={showNew} onToggle={() => setShowNew(!showNew)}
          />
          <Field
            label="Confirmer le nouveau mot de passe"
            value={form.confirm}
            onChange={v => setForm({ ...form, confirm: v })}
            show={showNew} onToggle={() => setShowNew(!showNew)}
          />

          <button type="submit" className="btn-primary" disabled={loading}
            style={{ marginTop:4, justifyContent:'center', padding:'0.6rem' }}>
            {loading
              ? <><div style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Modification...</>
              : 'Modifier le mot de passe'
            }
          </button>
        </form>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
