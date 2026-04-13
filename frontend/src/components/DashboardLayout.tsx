import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  BarChart3, FileText, Users, Shield, LogOut,
  ChevronRight, Activity
} from 'lucide-react'

export default function DashboardLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { to: '/reports', icon: FileText, label: 'My Reports' },
    ...(isAdmin ? [
      { to: '/admin/reports', icon: BarChart3, label: 'Manage Reports' },
      { to: '/admin/users', icon: Users, label: 'Users' },
      { to: '/admin/audit', icon: Activity, label: 'Audit Logs' },
    ] : []),
  ]

  return (
    <div className="min-h-screen bg-navy-950 bg-grid flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 glass border-r border-slate-800/60 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-accent-500/15 border border-accent-500/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-accent-400" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-white leading-none">JasperPortal</h1>
              <p className="text-[10px] text-slate-500 mt-0.5">Reports Platform</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scroll-custom">
          {isAdmin && (
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 py-2 mt-1">
              User
            </p>
          )}
          <NavLink to="/reports"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FileText className="w-4 h-4" />
            My Reports
          </NavLink>

          {isAdmin && (
            <>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-3 py-2 mt-3">
                Administration
              </p>
              <NavLink to="/admin/reports"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <BarChart3 className="w-4 h-4" />
                Manage Reports
              </NavLink>
              <NavLink to="/admin/users"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Users className="w-4 h-4" />
                Users
              </NavLink>
              <NavLink to="/admin/audit"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <Activity className="w-4 h-4" />
                Audit Logs
              </NavLink>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-accent-500/20 border border-accent-500/30 flex items-center justify-center shrink-0">
              <span className="text-accent-400 text-xs font-bold uppercase">
                {user?.username?.[0] || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.username}</p>
              <span className={`text-[10px] font-medium ${user?.role?.name === 'admin' ? 'text-gold-400' : 'text-slate-500'}`}>
                {user?.role?.name === 'admin' ? '⚡ Admin' : 'User'}
              </span>
            </div>
            <button onClick={logout}
              className="text-slate-600 hover:text-red-400 transition-colors p-1"
              title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto scroll-custom">
        <Outlet />
      </main>
    </div>
  )
}
