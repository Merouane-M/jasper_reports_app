import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage         from './pages/LoginPage';
import RegisterPage      from './pages/RegisterPage';
import DashboardPage     from './pages/DashboardPage';
import ReportRunPage     from './pages/ReportRunPage';
import AdminReportsPage  from './pages/admin/AdminReportsPage';
import AdminUsersPage    from './pages/admin/AdminUsersPage';
import AuditPage         from './pages/admin/AuditPage';
import AppLayout         from './components/layout/AppLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;
  if (!user)   return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)              return null;
  if (!user)                return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={
            <ProtectedRoute><AppLayout /></ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"            element={<DashboardPage />} />
            <Route path="reports/:id/run"      element={<ReportRunPage />} />
            <Route path="admin/reports"        element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
            <Route path="admin/users"          element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="admin/audit"          element={<AdminRoute><AuditPage /></AdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
