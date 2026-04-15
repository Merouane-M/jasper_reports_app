import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './components/DashboardLayout'
import ReportsPage from './pages/ReportsPage'
import AdminReportsPage from './pages/AdminReportsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminRolesPage from './pages/AdminRolesPage'
import AuditLogsPage from './pages/AuditLogsPage'
import ChangePasswordPage from './pages/ChangePasswordPage'

function Spinner() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
      <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--brand)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/rapports" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/rapports" replace />} />
              <Route path="rapports" element={<ReportsPage />} />
              <Route path="mon-compte" element={<ChangePasswordPage />} />
              <Route path="admin/rapports"    element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
              <Route path="admin/utilisateurs" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
              <Route path="admin/roles"        element={<AdminRoute><AdminRolesPage /></AdminRoute>} />
              <Route path="admin/audit"        element={<AdminRoute><AuditLogsPage /></AdminRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/rapports" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
