import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore.js';
import { useVapi } from '../lib/useVapi.js';
import { PageHeader, Banner, Spinner, EmptyState } from '../components/ui.jsx';

const DEFAULT_FIRST_MESSAGE =
  'Hi {{name}}, this is Alex calling from Zygonich. Do you have a quick minute?';
const DEFAULT_SYSTEM_PROMPT =
  'You are Alex, a friendly outbound sales representative for Zygonich. ' +
  "You are calling {{name}} from {{company}}. Keep the conversation natural and concise. " +
  "Your goal is to introduce Zygonich's software product and book a follow-up meeting if there is interest. " +
  'Be polite, listen, and respect the prospect if they want to end the call.';

export default function AssistantsPage() {
  const client = useVapi();
  const apiKey = useStore((s) => s.apiKey);
  const assistant = useStore((s) => s.assistant);
  const setAssistant = useStore((s) => s.setAssistant);

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!client) return;
    setLoading(true);
    setError(null);
    try {
      const data = await client.listAssistants({ limit: 100 });
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

  if (!apiKey) {
    return (
      <div>
        <PageHeader title="Assistant" subtitle="Choose or create the AI agent that will speak on calls." />
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
      <PageHeader
        title="Assistant"
        subtitle="Choose or create the AI agent that will speak on your calls."
      >
        <button className="btn-secondary" onClick={load} disabled={loading}>
          {loading ? <Spinner /> : '↻'} Refresh
        </button>
        <button className="btn-primary" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Close' : '+ New assistant'}
        </button>
      </PageHeader>

      {error && (
        <div className="mb-4">
          <Banner type="error">{error}</Banner>
        </div>
      )}

      {showCreate && (
        <div className="mb-6">
          <CreateAssistantForm
            client={client}
            onCreated={(created) => {
              setShowCreate(false);
              setAssistant({ id: created.id, name: created.name || 'Untitled assistant' });
              load();
            }}
          />
        </div>
      )}

      {loading && list.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Spinner /> Loading assistants…
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon="🤖" title="No assistants yet">
          Create your first outbound calling assistant to define how it greets and talks to leads.
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((a) => {
            const selected = assistant?.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAssistant({ id: a.id, name: a.name || 'Untitled assistant' })}
                className={`rounded-xl border p-4 text-left transition ${
                  selected
                    ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-slate-900">{a.name || 'Untitled assistant'}</div>
                  {selected && (
                    <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                      Selected
                    </span>
                  )}
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                  {a.firstMessage || 'No first message set.'}
                </div>
                <div className="mt-2 font-mono text-[11px] text-slate-400">{a.id}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateAssistantForm({ client, onCreated }) {
  const [name, setName] = useState('Outbound Sales Assistant');
  const [firstMessage, setFirstMessage] = useState(DEFAULT_FIRST_MESSAGE);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [voiceId, setVoiceId] = useState('cgSgspJ2msm6clMCkdW9');
  const [modelName, setModelName] = useState('gpt-4o');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await client.createAssistant({
        name,
        firstMessage,
        systemPrompt,
        model: { provider: 'openai', model: modelName },
        voice: { provider: '11labs', voiceId },
      });
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Create a new assistant</h2>

      {error && (
        <div className="mb-4">
          <Banner type="error">{error}</Banner>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Voice ID (11labs)</label>
          <input className="input font-mono" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <label className="label">First message</label>
        <input
          className="input"
          value={firstMessage}
          onChange={(e) => setFirstMessage(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          You can use variables from your leads file like <code>{'{{name}}'}</code> and{' '}
          <code>{'{{company}}'}</code>.
        </p>
      </div>

      <div className="mt-4">
        <label className="label">System prompt</label>
        <textarea
          className="input min-h-[120px]"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />
      </div>

      <div className="mt-4 max-w-xs">
        <label className="label">Model</label>
        <select className="input" value={modelName} onChange={(e) => setModelName(e.target.value)}>
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="gpt-4.1">gpt-4.1</option>
          <option value="gpt-4.1-mini">gpt-4.1-mini</option>
        </select>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Spinner /> : null}
          {saving ? 'Creating…' : 'Create assistant'}
        </button>
      </div>
    </form>
  );
}
