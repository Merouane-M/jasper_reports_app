import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { reportsApi } from '../services/api';
import { Report, ReportParameter } from '../types';

const OUTPUT_FORMATS = [
  { value: 'pdf',  label: 'PDF'   },
  { value: 'xlsx', label: 'Excel' },
  { value: 'csv',  label: 'CSV'   },
  { value: 'html', label: 'HTML'  },
];

export default function ReportRunPage() {
  const { id } = useParams<{ id: string }>();
  const [report,  setReport]  = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [values,  setValues]  = useState<Record<string, string | string[]>>({});
  const [format,  setFormat]  = useState('pdf');
  const [running, setRunning] = useState(false);
  const [error,   setError]   = useState('');
  const [blobUrl, setBlobUrl] = useState('');

  useEffect(() => {
    if (!id) return;
    reportsApi.get(id)
      .then(r => {
        setReport(r.data);
        console.log('Report parameters:', r.data.parameters);
        // Seed default values
        const defaults: Record<string, string | string[]> = {};
        (r.data.parameters ?? []).forEach((p: ReportParameter) => {
          if (p.defaultValue) {
            defaults[p.name] = p.defaultValue;
          }
        });
        setValues(defaults);
      })
      .catch(err => {
        console.error('Failed to load report:', err);
        setError('Failed to load report');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleRun = async () => {
    setError('');
    setRunning(true);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    try {
      // Convert array values to comma-separated strings for backend
      const params: Record<string, string> = {};
      Object.entries(values).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          params[key] = val.join(',');
        } else {
          params[key] = val;
        }
      });
      
      const res = await reportsApi.execute(id!, params, format);
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);

      // Download if not PDF/HTML
      if (format !== 'pdf' && format !== 'html') {
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report?.name ?? 'report'}.${format}`;
        a.click();
      }
    } catch (err: unknown) {
      const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(axiosMsg ?? 'Report execution failed');
    } finally {
      setRunning(false);
    }
  };

  const renderField = (param: ReportParameter) => {
    const isMulti = param.type === 'dropdown' && param.options && Array.isArray(JSON.parse(param.options || '[]'));
    const currentValue = values[param.name] ?? (isMulti ? [] : '');

    if (param.type === 'dropdown' && param.options) {
      try {
        const options = JSON.parse(param.options);
        const isArray = Array.isArray(options);
        
        if (isArray && options[0]?.multiple) {
          // Multi-select dropdown
          const opts = options[0].options || [];
          const selectedValues = Array.isArray(currentValue) ? currentValue : (currentValue ? [currentValue] : []);
          
          return (
            <select
              multiple
              className="input"
              value={selectedValues}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setValues(prev => ({ ...prev, [param.name]: selected }));
              }}
              style={{ minHeight: '100px' }}
            >
              {opts.map((opt: any) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          );
        } else {
          // Single-select dropdown
          const opts = isArray ? options : [];
          return (
            <select
              className="input"
              value={currentValue}
              onChange={(e) =>
                setValues(prev => ({ ...prev, [param.name]: e.target.value }))
              }
            >
              <option value="">Select…</option>
              {opts.map((opt: any) => (
                <option key={opt.value || opt} value={opt.value || opt}>
                  {opt.label || opt}
                </option>
              ))}
            </select>
          );
        }
      } catch (e) {
        console.error(`Failed to parse options for ${param.name}:`, e);
        return <input type="text" className="input" value={currentValue} onChange={(e) => setValues(prev => ({ ...prev, [param.name]: e.target.value }))} />;
      }
    }

    const common = {
      className: 'input',
      value:     currentValue,
      onChange:  (e: React.ChangeEvent<HTMLInputElement>) =>
        setValues(prev => ({ ...prev, [param.name]: e.target.value })),
    };

    if (param.type === 'date')   return <input {...common} type="date" />;
    if (param.type === 'number') return <input {...common} type="number" />;
    return <input {...common} type="text" />;
  };

  if (loading) {
    return <div className="p-8 text-gray-400">Loading report…</div>;
  }
  if (!report) {
    return (
      <div className="p-8 text-center text-gray-500">
        Report not found. <Link to="/dashboard" className="text-brand-600 hover:underline">Back to dashboard</Link>
      </div>
    );
  }

  const params = report.parameters ?? [];

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Back</Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">{report.name}</h1>
        {report.description && (
          <p className="text-gray-500 text-sm mt-1">{report.description}</p>
        )}
      </div>

      <div className="card p-6 space-y-5">
        {/* Parameters */}
        {params.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Parameters</h2>
            {params.map(param => (
              <div key={param.id}>
                <label className="label">
                  {param.label}
                  {param.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {renderField(param)}
              </div>
            ))}
          </div>
        )}

        {/* Output format */}
        <div>
          <label className="label">Output format</label>
          <div className="flex gap-2 flex-wrap">
            {OUTPUT_FORMATS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  format === f.value
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={running}
          className="btn-primary"
        >
          {running ? 'Generating…' : `Generate ${format.toUpperCase()}`}
        </button>
      </div>

      {/* Inline PDF/HTML preview */}
      {blobUrl && format === 'pdf' && (
        <div className="mt-6 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Preview</span>
            <a href={blobUrl} download={`${report.name}.pdf`} className="btn-secondary text-xs">
              Download
            </a>
          </div>
          <iframe src={blobUrl} className="w-full h-[600px]" title="Report preview" />
        </div>
      )}

      {blobUrl && format === 'html' && (
        <div className="mt-6 card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-medium text-gray-700">Preview</span>
            <a href={blobUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
              Open in new tab
            </a>
          </div>
          <iframe src={blobUrl} className="w-full h-[500px]" title="HTML report" />
        </div>
      )}
    </div>
  );
}
