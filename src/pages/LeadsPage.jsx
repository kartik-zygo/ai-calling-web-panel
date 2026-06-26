import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore.js';
import { parseLeadFile } from '../lib/parseFile.js';
import { LEAD_COLUMNS, buildTemplateCsv } from '../lib/schema.js';
import { PageHeader, Banner, Spinner, EmptyState } from '../components/ui.jsx';
import FileDropzone from '../components/FileDropzone.jsx';

function downloadTemplate() {
  const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const leads = useStore((s) => s.leads);
  const leadsMeta = useStore((s) => s.leadsMeta);
  const defaultCountryCode = useStore((s) => s.defaultCountryCode);
  const setLeads = useStore((s) => s.setLeads);
  const updateLead = useStore((s) => s.updateLead);
  const removeLead = useStore((s) => s.removeLead);
  const clearLeads = useStore((s) => s.clearLeads);

  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const [onlyInvalid, setOnlyInvalid] = useState(false);

  const onFile = async (file) => {
    setParsing(true);
    setError(null);
    try {
      const result = await parseLeadFile(file, { defaultCountryCode });
      if (result.missingRequired.length > 0) {
        setError(
          `Your file is missing required column(s): ${result.missingRequired.join(
            ', '
          )}. Please use the template format.`
        );
      }
      setLeads(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setParsing(false);
    }
  };

  const validCount = useMemo(() => leads.filter((l) => l.valid).length, [leads]);
  const invalidCount = leads.length - validCount;
  const visibleLeads = onlyInvalid ? leads.filter((l) => !l.valid) : leads;
  const customKeys = leadsMeta?.customKeys || [];

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle="Upload your CSV or Excel file. We'll extract, validate, and let you fix rows before calling."
      >
        <button className="btn-secondary" onClick={downloadTemplate}>
          ⬇ Download template
        </button>
        {leads.length > 0 && (
          <button className="btn-danger" onClick={clearLeads}>
            Clear
          </button>
        )}
      </PageHeader>

      <div className="mb-6">
        <FormatSpec />
      </div>

      {leads.length === 0 ? (
        <>
          {parsing ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-12 text-sm text-slate-500">
              <Spinner /> Parsing file…
            </div>
          ) : (
            <FileDropzone onFile={onFile} disabled={parsing} />
          )}
          {error && (
            <div className="mt-4">
              <Banner type="error">{error}</Banner>
            </div>
          )}
        </>
      ) : (
        <>
          {error && (
            <div className="mb-4">
              <Banner type="error">{error}</Banner>
            </div>
          )}

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Stat label="Total" value={leads.length} />
            <Stat label="Ready to call" value={validCount} tone="success" />
            <Stat label="Need fixing" value={invalidCount} tone={invalidCount ? 'error' : 'muted'} />
            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-slate-500">
                File: <span className="font-medium text-slate-700">{leadsMeta?.fileName}</span>
              </span>
              <label className="flex items-center gap-2 text-slate-600">
                <input
                  type="checkbox"
                  checked={onlyInvalid}
                  onChange={(e) => setOnlyInvalid(e.target.checked)}
                />
                Show only invalid
              </label>
              <FileDropzoneButton onFile={onFile} />
            </div>
          </div>

          {invalidCount > 0 && (
            <div className="mb-4">
              <Banner type="warning">
                {invalidCount} row(s) have problems (missing name or invalid phone). Fix them inline
                below or they'll be skipped when calling. Tip: set a default country code in{' '}
                <Link to="/settings" className="font-medium underline">
                  Settings
                </Link>{' '}
                if numbers lack a “+”.
              </Banner>
            </div>
          )}

          <LeadsTable
            leads={visibleLeads}
            customKeys={customKeys}
            onEdit={updateLead}
            onRemove={removeLead}
          />

          <div className="mt-6 flex justify-end">
            <Link to="/campaign" className="btn-primary">
              Continue to campaign →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function FileDropzoneButton({ onFile }) {
  // Compact "replace file" trigger reusing a hidden input.
  const id = 'replace-file-input';
  return (
    <>
      <label htmlFor={id} className="btn-secondary cursor-pointer">
        Replace file
      </label>
      <input
        id={id}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
    </>
  );
}

function Stat({ label, value, tone = 'muted' }) {
  const toneCls = {
    muted: 'text-slate-700',
    success: 'text-emerald-600',
    error: 'text-red-600',
  }[tone];
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

function FormatSpec() {
  return (
    <div className="card">
      <h2 className="mb-3 text-base font-semibold text-slate-900">Required file format</h2>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Column</th>
              <th className="px-3 py-2">Required</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Example</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {LEAD_COLUMNS.map((c) => (
              <tr key={c.key}>
                <td className="px-3 py-2 font-mono font-medium text-slate-800">{c.label}</td>
                <td className="px-3 py-2">
                  {c.required ? (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">
                      required
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">optional</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-600">{c.description}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{c.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Column headers are matched case-insensitively. Any <strong>extra columns</strong> you include
        (e.g. <code>plan</code>, <code>city</code>) are kept and passed to the assistant as variables
        you can reference in the prompt with <code>{'{{column_name}}'}</code>.
      </p>
    </div>
  );
}

function LeadsTable({ leads, customKeys, onEdit, onRemove }) {
  if (leads.length === 0) {
    return <EmptyState icon="✅" title="No rows to show" />;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Normalized</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Company</th>
            {customKeys.map((k) => (
              <th key={k} className="px-3 py-2">
                {k}
              </th>
            ))}
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((l) => (
            <tr key={l.id} className={l.valid ? '' : 'bg-red-50/40'}>
              <td className="px-3 py-2 text-slate-400">{l._row}</td>
              <td className="px-3 py-2">
                {l.valid ? (
                  <span title="Ready" className="text-emerald-500">
                    ✓
                  </span>
                ) : (
                  <span title={l.errors.join('; ')} className="cursor-help text-red-500">
                    ✕
                  </span>
                )}
              </td>
              <td className="px-2 py-1">
                <input
                  className={`w-full rounded border-0 bg-transparent px-1.5 py-1 focus:bg-white focus:ring-1 ${
                    !l.name ? 'ring-1 ring-red-300' : 'focus:ring-brand-400'
                  }`}
                  value={l.name}
                  onChange={(e) => onEdit(l.id, { name: e.target.value })}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  className={`w-full rounded border-0 bg-transparent px-1.5 py-1 font-mono focus:bg-white focus:ring-1 ${
                    !l.phoneValid ? 'ring-1 ring-red-300' : 'focus:ring-brand-400'
                  }`}
                  value={l.phone}
                  onChange={(e) => onEdit(l.id, { phone: e.target.value })}
                />
              </td>
              <td className="px-3 py-2 font-mono text-xs text-slate-500">
                {l.phoneValid ? l.phoneNormalized : <span className="text-red-500">—</span>}
              </td>
              <td className="px-2 py-1">
                <input
                  className="w-full rounded border-0 bg-transparent px-1.5 py-1 focus:bg-white focus:ring-1 focus:ring-brand-400"
                  value={l.email}
                  onChange={(e) => onEdit(l.id, { email: e.target.value })}
                />
              </td>
              <td className="px-2 py-1">
                <input
                  className="w-full rounded border-0 bg-transparent px-1.5 py-1 focus:bg-white focus:ring-1 focus:ring-brand-400"
                  value={l.company}
                  onChange={(e) => onEdit(l.id, { company: e.target.value })}
                />
              </td>
              {customKeys.map((k) => (
                <td key={k} className="px-3 py-2 text-slate-600">
                  {l.custom?.[k] ?? ''}
                </td>
              ))}
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => onRemove(l.id)}
                  className="text-slate-400 hover:text-red-500"
                  title="Remove row"
                >
                  🗑
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
