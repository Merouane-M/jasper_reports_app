import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import {
  BarChart3, FileText, Users, Activity,
  LogOut, Sun, Moon, KeyRound, ShieldCheck, UserCog
} from 'lucide-react'

export default function DashboardLayout() {
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-base)' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 232, flexShrink: 0,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        display: 'flex', flexDirection: 'column',
        height: '100vh', position: 'sticky', top: 0,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.125rem 1rem', borderBottom: '1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:34, height:34, borderRadius:9,
            background:'var(--brand)', display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 2px 8px rgba(37,99,235,0.35)'
          }}>
            <BarChart3 size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily:'Outfit', fontWeight:700, fontSize:'0.95rem', color:'var(--text-primary)', lineHeight:1 }}>JasperPortal</div>
            <div style={{ fontSize:'0.68rem', color:'var(--text-muted)', marginTop:2 }}>Gestion des rapports</div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex:1, padding:'0.75rem 0.625rem', overflowY:'auto' }} className="scroll-thin">

          <div className="nav-section-label">Rapports</div>
          <NavLink to="/rapports" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <FileText size={16} /><span>Mes rapports</span>
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop:'1rem' }}>Administration</div>
              <NavLink to="/admin/rapports"     className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <BarChart3 size={16} /><span>Gérer les rapports</span>
              </NavLink>
              <NavLink to="/admin/utilisateurs" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Users size={16} /><span>Utilisateurs</span>
              </NavLink>
              <NavLink to="/admin/roles"        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <ShieldCheck size={16} /><span>Rôles</span>
              </NavLink>
              <NavLink to="/admin/audit"        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <Activity size={16} /><span>Journal d'audit</span>
              </NavLink>
            </>
          )}

          <div className="nav-section-label" style={{ marginTop:'1rem' }}>Mon compte</div>
          <NavLink to="/mon-compte" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <KeyRound size={16} /><span>Changer le mot de passe</span>
          </NavLink>
        </nav>

        {/* Footer */}
        <div style={{ padding:'0.75rem', borderTop:'1px solid var(--border)' }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="nav-link" style={{ width:'100%', marginBottom:4 }}>
            {theme === 'light'
              ? <><Moon size={16} /><span>Mode sombre</span></>
              : <><Sun size={16} /><span>Mode clair</span></>
            }
          </button>

          {/* User info + logout */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0.5rem 0.75rem' }}>
            <div style={{
              width:30, height:30, borderRadius:'50%',
              background:'var(--brand-light)',
              border:'2px solid var(--brand)',
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink:0,
            }}>
              <span style={{ color:'var(--brand)', fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase' }}>
                {user?.username?.[0] || '?'}
              </span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:'0.8rem', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {user?.username}
              </div>
              <div style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
                {user?.role?.name}
              </div>
            </div>
            <button onClick={logout} title="Se déconnecter" style={{
              background:'none', border:'none', cursor:'pointer',
              color:'var(--text-muted)', padding:4, borderRadius:6,
              display:'flex', alignItems:'center',
              transition:'color 0.15s'
            }}
              onMouseEnter={e => (e.currentTarget.style.color='#dc2626')}
              onMouseLeave={e => (e.currentTarget.style.color='var(--text-muted)')}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex:1, minWidth:0, overflowY:'auto' }} className="scroll-thin">
        <Outlet />
      </main>
    </div>
  )
}
