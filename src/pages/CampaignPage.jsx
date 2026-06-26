import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore.js';
import { useVapi } from '../lib/useVapi.js';
import { PageHeader, Banner, Spinner } from '../components/ui.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const ACTIVE_STATUSES = ['creating', 'queued', 'ringing', 'in-progress', 'forwarding'];
const isActive = (s) => ACTIVE_STATUSES.includes(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildVariables(lead) {
  const v = {};
  if (lead.name) v.name = lead.name;
  if (lead.email) v.email = lead.email;
  if (lead.company) v.company = lead.company;
  for (const [k, val] of Object.entries(lead.custom || {})) {
    if (val != null && String(val) !== '') v[k] = String(val);
  }
  return v;
}

export default function CampaignPage() {
  const client = useVapi();
  const apiKey = useStore((s) => s.apiKey);
  const assistant = useStore((s) => s.assistant);
  const phoneNumber = useStore((s) => s.phoneNumber);
  const leads = useStore((s) => s.leads);
  const calls = useStore((s) => s.calls);
  const campaignRunning = useStore((s) => s.campaignRunning);
  const resetCalls = useStore((s) => s.resetCalls);

  const [concurrency, setConcurrency] = useState(1);
  const [delaySec, setDelaySec] = useState(2);
  const runningRef = useRef(false);

  const validLeads = useMemo(() => leads.filter((l) => l.valid), [leads]);
  const invalidCount = leads.length - validLeads.length;

  const ready = Boolean(apiKey && assistant?.id && phoneNumber?.id && validLeads.length > 0);

  // ---- Live polling of in-flight calls ----
  useEffect(() => {
    if (!client) return undefined;
    const interval = setInterval(async () => {
      const current = useStore.getState().calls;
      const setCall = useStore.getState().setCall;
      const toPoll = Object.entries(current).filter(([, c]) => c.callId && isActive(c.status));
      if (toPoll.length === 0) return;
      await Promise.all(
        toPoll.map(async ([leadId, c]) => {
          try {
            const call = await client.getCall(c.callId);
            setCall(leadId, {
              status: call.status,
              endedReason: call.endedReason,
              cost: call.cost,
              startedAt: call.startedAt,
              endedAt: call.endedAt,
            });
          } catch {
            /* transient error, retry next tick */
          }
        })
      );
    }, 4000);
    return () => clearInterval(interval);
  }, [client]);

  const startCampaign = async ({ retryFailedOnly = false } = {}) => {
    if (runningRef.current || !client) return;
    runningRef.current = true;
    useStore.getState().setCampaignRunning(true);

    const state = useStore.getState();
    const queue = state.leads
      .filter((l) => l.valid)
      .filter((l) => {
        const c = state.calls[l.id];
        if (retryFailedOnly) return c?.status === 'failed';
        if (!c) return true; // never called
        return c.status !== 'ended' && !isActive(c.status); // recall idle/failed, skip ended/active
      });

    let idx = 0;
    const delayMs = Math.max(0, delaySec) * 1000;

    const worker = async () => {
      while (runningRef.current && idx < queue.length) {
        const lead = queue[idx++];
        const setCall = useStore.getState().setCall;
        setCall(lead.id, { status: 'creating', error: null, callId: null });
        try {
          const call = await client.createCall({
            assistantId: assistant.id,
            phoneNumberId: phoneNumber.id,
            customer: {
              number: lead.phoneNormalized,
              name: lead.name || undefined,
            },
            variableValues: buildVariables(lead),
          });
          setCall(lead.id, { callId: call.id, status: call.status || 'queued', error: null });
        } catch (err) {
          setCall(lead.id, { status: 'failed', error: err.message });
        }
        if (delayMs) await sleep(delayMs);
      }
    };

    const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
    await Promise.all(workers);

    runningRef.current = false;
    useStore.getState().setCampaignRunning(false);
  };

  const stopCampaign = () => {
    runningRef.current = false;
    useStore.getState().setCampaignRunning(false);
  };

  // ---- Stats ----
  const stats = useMemo(() => {
    let active = 0;
    let ended = 0;
    let failed = 0;
    let cost = 0;
    for (const l of validLeads) {
      const c = calls[l.id];
      if (!c) continue;
      if (isActive(c.status)) active += 1;
      else if (c.status === 'ended') ended += 1;
      else if (c.status === 'failed') failed += 1;
      if (typeof c.cost === 'number') cost += c.cost;
    }
    const notCalled = validLeads.length - active - ended - failed;
    return { active, ended, failed, cost, notCalled };
  }, [validLeads, calls]);

  const failedCount = stats.failed;

  if (!ready) {
    return (
      <div>
        <PageHeader title="Campaign" subtitle="Place outbound AI calls to your leads." />
        <Checklist apiKey={apiKey} assistant={assistant} phoneNumber={phoneNumber} validLeads={validLeads} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Campaign" subtitle="Place outbound AI calls to your leads and track results live." />

      <div className="mb-6 card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Assistant" value={assistant.name} mono />
          <Summary label="From number" value={phoneNumber.label} mono />
          <Summary label="Leads ready" value={`${validLeads.length}`} />
          <Summary
            label="Skipped (invalid)"
            value={`${invalidCount}`}
            tone={invalidCount ? 'warn' : 'muted'}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-5">
          <div className="w-44">
            <label className="label">Max concurrent calls</label>
            <select
              className="input"
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              disabled={campaignRunning}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="label">Delay between dials (s)</label>
            <input
              type="number"
              min="0"
              className="input"
              value={delaySec}
              onChange={(e) => setDelaySec(Number(e.target.value))}
              disabled={campaignRunning}
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {campaignRunning ? (
              <button className="btn-danger" onClick={stopCampaign}>
                ■ Stop
              </button>
            ) : (
              <button className="btn-primary" onClick={() => startCampaign()}>
                🚀 Start campaign
              </button>
            )}
            {!campaignRunning && failedCount > 0 && (
              <button className="btn-secondary" onClick={() => startCampaign({ retryFailedOnly: true })}>
                ↻ Retry failed ({failedCount})
              </button>
            )}
            {!campaignRunning && (
              <button className="btn-secondary" onClick={resetCalls}>
                Reset results
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {campaignRunning && (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-700">
            <Spinner /> Campaign running…
          </span>
        )}
        <Stat label="Not called" value={stats.notCalled} />
        <Stat label="Active" value={stats.active} tone="info" />
        <Stat label="Completed" value={stats.ended} tone="success" />
        <Stat label="Failed" value={stats.failed} tone={stats.failed ? 'error' : 'muted'} />
        <Stat label="Est. cost" value={`$${stats.cost.toFixed(3)}`} />
      </div>

      <ResultsTable leads={validLeads} calls={calls} />
    </div>
  );
}

function ResultsTable({ leads, calls }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Number</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Outcome</th>
            <th className="px-3 py-2">Cost</th>
            <th className="px-3 py-2">Call ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leads.map((l) => {
            const c = calls[l.id] || { status: 'idle' };
            return (
              <tr key={l.id}>
                <td className="px-3 py-2 font-medium text-slate-800">{l.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600">{l.phoneNormalized}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {c.error ? (
                    <span className="text-red-600">{c.error}</span>
                  ) : (
                    c.endedReason || '—'
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {typeof c.cost === 'number' ? `$${c.cost.toFixed(3)}` : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-400">
                  {c.callId ? (
                    <a
                      href={`https://dashboard.vapi.ai/calls/${c.callId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-brand-600 hover:underline"
                    >
                      {c.callId.slice(0, 8)}…
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Summary({ label, value, mono, tone = 'muted' }) {
  const toneCls = { muted: 'text-slate-800', warn: 'text-amber-600' }[tone];
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-0.5 truncate text-sm font-semibold ${mono ? 'font-mono' : ''} ${toneCls}`}>
        {value}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'muted' }) {
  const toneCls = {
    muted: 'text-slate-700',
    info: 'text-sky-600',
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

function Checklist({ apiKey, assistant, phoneNumber, validLeads }) {
  const items = [
    { ok: Boolean(apiKey), label: 'Connect your Vapi API key', to: '/settings' },
    { ok: Boolean(assistant?.id), label: 'Select or create an assistant', to: '/assistants' },
    { ok: Boolean(phoneNumber?.id), label: 'Select or create a phone number', to: '/phone-numbers' },
    { ok: validLeads.length > 0, label: 'Upload at least one valid lead', to: '/leads' },
  ];
  return (
    <div className="card max-w-xl">
      <Banner type="info" title="Finish setup to start calling">
        Complete these steps, then come back here to launch your campaign.
      </Banner>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.to} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                it.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}
            >
              {it.ok ? '✓' : '•'}
            </span>
            <span className={it.ok ? 'text-slate-500 line-through' : 'text-slate-700'}>{it.label}</span>
            {!it.ok && (
              <Link to={it.to} className="ml-auto text-sm font-medium text-brand-600 hover:underline">
                Go →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
