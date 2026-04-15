import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Eye, EyeOff, BarChart3, AlertCircle, Sun, Moon } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/rapports')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Connexion impossible. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-base)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', position:'relative' }}>

      {/* Theme toggle top-right */}
      <button onClick={toggleTheme} style={{
        position:'absolute', top:16, right:16,
        background:'var(--bg-surface)', border:'1px solid var(--border)',
        borderRadius:8, padding:'0.5rem', cursor:'pointer',
        display:'flex', alignItems:'center', color:'var(--text-secondary)'
      }}>
        {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      <div className="animate-in" style={{ width:'100%', maxWidth:380 }}>
        {/* Brand */}
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{
            width:52, height:52, borderRadius:14,
            background:'var(--brand)', margin:'0 auto 0.875rem',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 4px 16px rgba(37,99,235,0.35)'
          }}>
            <BarChart3 size={24} color="#fff" />
          </div>
          <h1 style={{ fontFamily:'Outfit', fontSize:'1.6rem', fontWeight:800, color:'var(--text-primary)', margin:0 }}>
            JasperPortal
          </h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.875rem', marginTop:4 }}>
            Plateforme de gestion des rapports
          </p>
        </div>

        <div className="card" style={{ borderRadius:16, padding:'1.75rem' }}>
          <h2 style={{ fontFamily:'Outfit', fontSize:'1.2rem', fontWeight:700, color:'var(--text-primary)', margin:'0 0 0.25rem' }}>
            Connexion
          </h2>
          <p style={{ color:'var(--text-muted)', fontSize:'0.82rem', marginTop:0, marginBottom:'1.5rem' }}>
            Accédez à votre espace de rapports
          </p>

          {error && (
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              background:'#fef2f2', border:'1px solid #fca5a5',
              borderRadius:8, padding:'0.625rem 0.75rem',
              marginBottom:'1rem', fontSize:'0.875rem', color:'#dc2626'
            }} className="dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400">
              <AlertCircle size={15} style={{ flexShrink:0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                Adresse e-mail
              </label>
              <input
                type="email" className="input-field"
                placeholder="admin@jasper.com"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>

            <div>
              <label style={{ display:'block', fontSize:'0.8rem', fontWeight:600, color:'var(--text-secondary)', marginBottom:6 }}>
                Mot de passe
              </label>
              <div style={{ position:'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field" style={{ paddingRight:'2.5rem' }}
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)',
                  display:'flex', alignItems:'center', padding:0
                }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width:'100%', justifyContent:'center', padding:'0.625rem', marginTop:4, fontSize:'0.9rem' }}>
              {loading
                ? <><div style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Connexion...</>
                : 'Se connecter'
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', fontSize:'0.75rem', color:'var(--text-muted)', marginTop:'1rem' }}>
          Compte par défaut : admin@jasper.com / Admin@123
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
