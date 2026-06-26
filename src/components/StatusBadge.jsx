// Maps a Vapi call status (or our local pseudo-statuses) to a colored badge.

const STATUS_MAP = {
  // local pseudo-statuses
  idle: { label: 'Not called', cls: 'bg-slate-100 text-slate-600' },
  creating: { label: 'Dialing…', cls: 'bg-indigo-100 text-indigo-700' },
  failed: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
  // Vapi statuses
  queued: { label: 'Queued', cls: 'bg-amber-100 text-amber-700' },
  ringing: { label: 'Ringing', cls: 'bg-amber-100 text-amber-700' },
  'in-progress': { label: 'In progress', cls: 'bg-sky-100 text-sky-700' },
  forwarding: { label: 'Forwarding', cls: 'bg-sky-100 text-sky-700' },
  ended: { label: 'Ended', cls: 'bg-emerald-100 text-emerald-700' },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_MAP[status] || { label: status || '—', cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}
