import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore.js';
import { useVapi } from '../lib/useVapi.js';
import { PageHeader, Banner, Spinner, EmptyState } from '../components/ui.jsx';

function labelFor(num) {
  return num.number || num.name || num.sipUri || num.id;
}

export default function PhoneNumbersPage() {
  const client = useVapi();
  const apiKey = useStore((s) => s.apiKey);
  const phoneNumber = useStore((s) => s.phoneNumber);
  const setPhoneNumber = useStore((s) => s.setPhoneNumber);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [areaCode, setAreaCode] = useState('415');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const load = async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const data = await client.listPhoneNumbers({ limit: 100 });
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const createNumber = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const created = await client.createFreePhoneNumber({
        areaCode: areaCode.trim() || undefined,
        name: 'Outbound caller',
      });
      setPhoneNumber({ id: created.id, label: labelFor(created) });
      await load();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (!apiKey) {
    return (
      <div>
        <PageHeader title="Phone Number" subtitle="The number your calls will be placed from." />
        <Banner type="warning">
          Connect your Vapi API key first on the{' '}
          <Link to="/settings" className="font-medium underline">
            Settings
          </Link>{' '}
          page.
        </Banner>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Phone Number" subtitle="The number your outbound calls will be placed from.">
        <button className="btn-secondary" onClick={load} disabled={loading}>
          {loading ? <Spinner /> : '↻'} Refresh
        </button>
      </PageHeader>

      <div className="mb-6 card max-w-2xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Get a free US number</h2>
        <p className="mb-4 text-sm text-slate-500">
          Vapi can provision a free US phone number for outbound calls. Free numbers are for US
          national use only — for international calling, import a Twilio number in the Vapi dashboard.
        </p>
        <div className="flex items-end gap-3">
          <div className="w-40">
            <label className="label">Desired area code</label>
            <input
              className="input"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
              placeholder="415"
            />
          </div>
          <button className="btn-primary" onClick={createNumber} disabled={creating}>
            {creating ? <Spinner /> : null}
            {creating ? 'Provisioning…' : 'Create number'}
          </button>
        </div>
        {createError && (
          <div className="mt-4">
            <Banner type="error">{createError}</Banner>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Banner type="error">{error}</Banner>
        </div>
      )}

      {loading && list.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Loading phone numbers…
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon="📞" title="No phone numbers yet">
          Create a free US number above, or import one from Twilio in the Vapi dashboard.
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((n) => {
            const selected = phoneNumber?.id === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setPhoneNumber({ id: n.id, label: labelFor(n) })}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">{labelFor(n)}</div>
                  {selected && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                      Selected
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs capitalize text-slate-500">
                  {n.provider || 'vapi'} {n.name ? `· ${n.name}` : ''}
                </div>
                <div className="mt-2 font-mono text-[11px] text-slate-400">{n.id}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
