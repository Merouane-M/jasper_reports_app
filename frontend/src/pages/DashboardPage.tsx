import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi } from '../services/api';
import { Report } from '../types';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    reportsApi.list()
      .then(r => setReports(r.data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = reports.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Select a report to run</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          className="input max-w-sm"
          placeholder="Search reports…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-full mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📭</div>
          <p className="font-medium">No reports found</p>
          <p className="text-sm mt-1">
            {search ? 'Try a different search term' : 'No reports are available to you yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(report => (
            <Link
              key={report.id}
              to={`/reports/${report.id}/run`}
              className="card p-5 hover:shadow-md hover:border-brand-100 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">📊</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  report.isPublic
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {report.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              <h3 className="font-medium text-gray-900 group-hover:text-brand-600 transition-colors mb-1">
                {report.name}
              </h3>
              {report.description && (
                <p className="text-sm text-gray-500 line-clamp-2">{report.description}</p>
              )}
              <div className="mt-4 text-xs text-brand-600 font-medium">
                Run report →
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
