import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, BarChart3, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../utils/api'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 1500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 bg-grid flex items-center justify-center p-4">
      <div className="absolute top-0 right-1/3 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent-500/15 border border-accent-500/30 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-accent-400" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white leading-none">JasperPortal</h1>
            <p className="text-xs text-slate-500 leading-none mt-0.5">Report Management System</p>
          </div>
        </div>

        <div className="glass rounded-2xl p-7">
          <h2 className="font-display text-2xl font-bold text-white mb-1">Create account</h2>
          <p className="text-slate-500 text-sm mb-6">Join the reporting platform</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2.5 mb-4 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2.5 mb-4 text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4 shrink-0" />Account created! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(['username', 'email'] as const).map(field => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 capitalize">{field}</label>
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  className="input-field"
                  value={form[field]}
                  onChange={e => setForm({ ...form, [field]: e.target.value })}
                  required
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input-field pr-10"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || success}
              className="w-full bg-accent-500 hover:bg-accent-400 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm mt-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-400 hover:text-accent-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
