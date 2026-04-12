import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navItem = (to: string, label: string, icon: string, adminOnly = false) =>
  ({ to, label, icon, adminOnly });

const NAV_ITEMS = [
  navItem('/dashboard',     'Reports',    '📊'),
  navItem('/admin/reports', 'Manage Reports', '⚙️',  true),
  navItem('/admin/users',   'Users',      '👥',  true),
  navItem('/admin/audit',   'Audit Logs', '🔍',  true),
];

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── Sidebar ───────────────────────────── */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-semibold text-gray-900 text-sm">Jasper Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.filter(i => !i.adminOnly || isAdmin).map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-800 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-sm font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <span className={isAdmin ? 'badge-admin' : 'badge-user'}>
            {user?.role}
          </span>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-left text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────── */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
