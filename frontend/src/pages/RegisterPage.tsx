import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({
        email:     form.email,
        password:  form.password,
        firstName: form.firstName,
        lastName:  form.lastName,
      });
      navigate('/login');
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(axiosMsg ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📋</div>
          <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Join the Jasper Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First name</label>
              <input className="input" value={form.firstName} onChange={set('firstName')} required />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.lastName} onChange={set('lastName')} required />
            </div>
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} required />
          </div>

          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={form.password} onChange={set('password')}
              placeholder="Min 8 chars, upper, lower, number, symbol" required />
          </div>

          <div>
            <label className="label">Confirm password</label>
            <input type="password" className="input" value={form.confirmPassword}
              onChange={set('confirmPassword')} required />
          </div>

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
