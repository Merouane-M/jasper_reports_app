import { useState, useEffect } from 'react'
import { Plus, Edit2, X, Save, CheckCircle, AlertCircle, Loader2, UserCheck, UserX, ShieldCheck } from 'lucide-react'
import api from '../utils/api'
import { User } from '../types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'user' })
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null)

  const fetchUsers = () => {
    api.get('/users/').then(res => setUsers(res.data)).finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [])

  const showToast = (msg: string, type: 'success'|'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ username: '', email: '', password: '', role: 'user' })
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditing(user)
    setForm({ username: user.username, email: user.email, password: '', role: user.role.name })
    setModalOpen(true)
  }

  const saveUser = async () => {
    try {
      const payload = editing
        ? { username: form.username, email: form.email, role: form.role }
        : form
      if (editing) {
        await api.put(`/users/${editing.id}`, payload)
        showToast('User updated')
      } else {
        await api.post('/users/', payload)
        showToast('User created')
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to save', 'error')
    }
  }

  const toggleStatus = async (user: User) => {
    await api.patch(`/users/${user.id}/toggle-status`)
    fetchUsers()
    showToast(`User ${user.is_active ? 'deactivated' : 'activated'}`)
  }

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role?.name === 'admin').length,
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage user accounts and roles</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />New User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-emerald-400' },
          { label: 'Admins', value: stats.admins, color: 'text-gold-400' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-accent-400 animate-spin" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="border-b border-slate-800/60">
              <tr>
                {['User', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent-500/15 border border-accent-500/25 flex items-center justify-center shrink-0">
                        <span className="text-accent-400 text-xs font-bold uppercase">{u.username[0]}</span>
                      </div>
                      <span className="font-medium text-white text-sm">{u.username}</span>
                    </div>
                  </td>
                  <td className="table-cell text-slate-400">{u.email}</td>
                  <td className="table-cell">
                    {u.role?.name === 'admin'
                      ? <span className="badge badge-amber"><ShieldCheck className="w-3 h-3" />Admin</span>
                      : <span className="badge badge-slate">User</span>
                    }
                  </td>
                  <td className="table-cell">
                    {u.is_active
                      ? <span className="badge badge-green">Active</span>
                      : <span className="badge badge-red">Inactive</span>
                    }
                  </td>
                  <td className="table-cell text-slate-500 text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleStatus(u)}
                        className={`p-1.5 transition-colors ${u.is_active ? 'text-slate-500 hover:text-red-400' : 'text-slate-500 hover:text-emerald-400'}`}
                        title={u.is_active ? 'Deactivate' : 'Activate'}>
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60">
              <h2 className="font-display font-bold text-white">{editing ? 'Edit User' : 'New User'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { key: 'username', label: 'Username', type: 'text' },
                { key: 'email', label: 'Email', type: 'email' },
                ...(!editing ? [{ key: 'password', label: 'Password', type: 'password' }] : []),
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
                  <input type={f.type} className="input-field"
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm({...form, [f.key]: e.target.value})} />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
                <div className="relative">
                  <select className="input-field appearance-none pr-8" value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-800/60">
              <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={saveUser} className="btn-primary flex-1 justify-center">
                <Save className="w-4 h-4" />{editing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
