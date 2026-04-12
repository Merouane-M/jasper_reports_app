import { useEffect, useState } from 'react';
import { usersApi } from '../../services/api';
import { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const load = () => {
    usersApi.list()
      .then(r => setUsers(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleRoleChange = async (id: string, role: string) => {
    await usersApi.updateRole(id, role);
    load();
  };

  const handleToggle = async (id: string) => {
    await usersApi.toggle(id);
    load();
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">Manage user accounts and roles</p>
      </div>

      <input
        className="input max-w-sm mb-6"
        placeholder="Search users…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['User', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => {
                const isSelf = u.id === currentUser?.id;
                const isActive = u.isActive ?? (u as unknown as { is_active: boolean }).is_active;
                const role = u.role ?? (u as unknown as { role: string }).role;
                const firstName = u.firstName ?? (u as unknown as { first_name: string }).first_name;
                const lastName  = u.lastName  ?? (u as unknown as { last_name: string }).last_name;

                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-xs font-medium shrink-0">
                          {firstName?.[0]}{lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {firstName} {lastName}
                            {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                          </p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={role}
                        onChange={e => handleRoleChange(u.id, e.target.value)}
                        disabled={isSelf}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt ?? (u as unknown as { created_at: string }).created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(u.id)}
                        disabled={isSelf}
                        className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-30"
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
