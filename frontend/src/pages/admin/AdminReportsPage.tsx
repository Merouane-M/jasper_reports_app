import { useEffect, useState } from 'react';
import { reportsApi, usersApi } from '../../services/api';
import { Report, ReportParameter, User } from '../../types';

type ModalMode = 'create' | 'edit' | 'params' | 'access' | null;

const EMPTY_REPORT = { name: '', description: '', jasperUrl: '', httpMethod: 'GET', isPublic: false };

export default function AdminReportsPage() {
  const [reports,    setReports]    = useState<Report[]>([]);
  const [users,      setUsers]      = useState<User[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modal,      setModal]      = useState<ModalMode>(null);
  const [selected,   setSelected]   = useState<Report | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_REPORT });
  const [params,     setParams]     = useState<ReportParameter[]>([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const load = () => {
    Promise.all([reportsApi.list(), usersApi.list()])
      .then(([r, u]) => { setReports(r.data); setUsers(u.data); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setSelected(null);
    setForm({ ...EMPTY_REPORT });
    setError('');
    setModal('create');
  };

  const openEdit = (r: Report) => {
    setSelected(r);
    setForm({
      name: r.name, description: r.description ?? '',
      jasperUrl: r.jasperUrl ?? (r as unknown as { jasper_url: string }).jasper_url ?? '',
      httpMethod: r.httpMethod ?? (r as unknown as { http_method: string }).http_method ?? 'GET',
      isPublic: r.isPublic ?? (r as unknown as { is_public: boolean }).is_public ?? false,
    });
    setError('');
    setModal('edit');
  };

  const openParams = async (r: Report) => {
    setSelected(r);
    // Fetch the full report to get all parameters
    try {
      const fullReport = await reportsApi.get(r.id);
      setParams(fullReport.data.parameters ?? []);
    } catch (err) {
      console.error('Failed to load parameters:', err);
      setParams(r.parameters ?? []);
    }
    setModal('params');
  };

  const openAccess = (r: Report) => {
    setSelected(r);
    setModal('access');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        await reportsApi.create(form);
      } else {
        await reportsApi.update(selected!.id, form);
      }
      setModal(null);
      load();
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(axiosMsg ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    await reportsApi.delete(id);
    load();
  };

  const handleToggle = async (id: string) => {
    await reportsApi.toggle(id);
    load();
  };

  const handleSaveParams = async () => {
    setSaving(true);
    try {
      await reportsApi.setParameters(selected!.id, params);
      setModal(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const addParam = () => setParams(prev => [
    ...prev,
    { id: crypto.randomUUID(), name: '', label: '', type: 'text', required: false, sortOrder: prev.length },
  ]);

  const updateParam = (i: number, key: string, value: unknown) => {
    setParams(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: value } : p));
  };

  const removeParam = (i: number) => setParams(prev => prev.filter((_, idx) => idx !== i));

  const handleGrantAccess = async (userId: string) => {
    await reportsApi.grantAccess(selected!.id, userId);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Manage available reports</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ New report</button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Visibility', 'Status', 'Method', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.name}</div>
                    {r.description && <div className="text-gray-400 text-xs truncate max-w-xs">{r.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      (r.isPublic ?? (r as unknown as {is_public: boolean}).is_public)
                        ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {(r.isPublic ?? (r as unknown as {is_public: boolean}).is_public) ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r.id)}
                      className={`text-xs px-2 py-0.5 rounded-full cursor-pointer border transition-colors ${
                        (r.isActive ?? (r as unknown as {is_active: boolean}).is_active)
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-gray-100 text-gray-400 border-gray-200'
                      }`}
                    >
                      {(r.isActive ?? (r as unknown as {is_active: boolean}).is_active) ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {r.httpMethod ?? (r as unknown as {http_method: string}).http_method}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(r)}   className="text-xs text-brand-600 hover:underline">Edit</button>
                      <button onClick={() => openParams(r).catch(() => {})} className="text-xs text-gray-500 hover:underline">Params</button>
                      <button onClick={() => openAccess(r)} className="text-xs text-gray-500 hover:underline">Access</button>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'New report' : 'Edit report'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}
            {[
              { key: 'name',        label: 'Name',        type: 'text' },
              { key: 'description', label: 'Description', type: 'text' },
              { key: 'jasperUrl',   label: 'Jasper URL',  type: 'text' },
            ].map(f => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                <input
                  className="input"
                  type={f.type}
                  value={(form as Record<string, string>)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">HTTP method</label>
                <select className="input" value={form.httpMethod}
                  onChange={e => setForm(prev => ({ ...prev, httpMethod: e.target.value }))}>
                  <option>GET</option>
                  <option>POST</option>
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isPublic}
                    onChange={e => setForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded border-gray-300 text-brand-600" />
                  <span className="text-sm text-gray-700">Public report</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Parameters modal */}
      {modal === 'params' && selected && (
        <Modal title={`Parameters — ${selected.name}`} onClose={() => setModal(null)} wide>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {params.map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Internal name</label>
                    <input className="input text-xs" value={p.name}
                      onChange={e => updateParam(i, 'name', e.target.value)} placeholder="startDate" />
                  </div>
                  <div>
                    <label className="label text-xs">Label</label>
                    <input className="input text-xs" value={p.label}
                      onChange={e => updateParam(i, 'label', e.target.value)} placeholder="Start Date" />
                  </div>
                  <div>
                    <label className="label text-xs">Type</label>
                    <select className="input text-xs" value={p.type}
                      onChange={e => updateParam(i, 'type', e.target.value)}>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Default value</label>
                    <input className="input text-xs" value={p.defaultValue ?? ''}
                      onChange={e => updateParam(i, 'defaultValue', e.target.value)} />
                  </div>
                </div>
                
                {p.type === 'dropdown' && (
                  <div>
                    <label className="label text-xs">Options (JSON)</label>
                    <textarea className="input text-xs font-mono" rows={3} value={p.options ?? ''}
                      onChange={e => updateParam(i, 'options', e.target.value)}
                      placeholder={`[{"value":"opt1","label":"Option 1"},{"value":"opt2","label":"Option 2"}]\n\nFor multi-select: [{"multiple":true,"options":[{"value":"opt1","label":"Option 1"}]}]`} />
                    <p className="text-xs text-gray-400 mt-1">Format: Array of {'{value, label}'} objects or multi-select format</p>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={p.required}
                      onChange={e => updateParam(i, 'required', e.target.checked)} />
                    Required
                  </label>
                  <button onClick={() => removeParam(i)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={addParam} className="btn-secondary text-sm">+ Add parameter</button>
            <button onClick={handleSaveParams} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Save parameters'}
            </button>
            <button onClick={() => setModal(null)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Access modal */}
      {modal === 'access' && selected && (
        <Modal title={`Access — ${selected.name}`} onClose={() => setModal(null)}>
          <p className="text-sm text-gray-500 mb-4">Grant users access to this report.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {users.filter(u => u.role !== 'admin').map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => reportsApi.grantAccess(selected.id, u.id).catch(() => {})}
                    className="text-xs btn-secondary">Grant</button>
                  <button onClick={() => reportsApi.revokeAccess(selected.id, u.id).catch(() => {})}
                    className="text-xs text-red-500 hover:underline">Revoke</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setModal(null)} className="btn-secondary mt-4">Done</button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide = false }: {
  title: string; children: React.ReactNode; onClose: () => void; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} p-6`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
