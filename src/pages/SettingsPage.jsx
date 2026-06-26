import { useState } from 'react';
import { useStore } from '../store/useStore.js';
import { createVapiClient } from '../lib/vapi.js';
import { PageHeader, Banner, Spinner } from '../components/ui.jsx';

export default function SettingsPage() {
  const apiKey = useStore((s) => s.apiKey);
  const setApiKey = useStore((s) => s.setApiKey);
  const defaultCountryCode = useStore((s) => s.defaultCountryCode);
  const setDefaultCountryCode = useStore((s) => s.setDefaultCountryCode);

  const [keyDraft, setKeyDraft] = useState(apiKey);
  const [ccDraft, setCcDraft] = useState(defaultCountryCode);
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null); // { ok, message }

  const onSave = () => {
    setApiKey(keyDraft);
    setDefaultCountryCode(ccDraft.trim());
    setResult({ ok: true, message: 'Settings saved.' });
  };

  const onTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      setApiKey(keyDraft);
      const client = createVapiClient(keyDraft.trim());
      await client.testConnection();
      setResult({ ok: true, message: 'Connected to Vapi successfully. Your API key is valid.' });
    } catch (err) {
      setResult({ ok: false, message: err.message || 'Connection failed.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Connect this panel to your Vapi account."
      />

      <div className="space-y-6">
        {/* <Banner type="warning" title="Heads up: your key lives in this browser">
          This is a frontend-only panel, so your <strong>private Vapi API key</strong> is stored in
          this browser's local storage 
        </Banner> */}

        <div className="card max-w-2xl">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Vapi API key</h2>

          <div className="mb-4">
            <label className="label" htmlFor="apiKey">
              Private API key
            </label>
            <div className="flex gap-2">
              <input
                id="apiKey"
                type={show ? 'text' : 'password'}
                className="input font-mono"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" className="btn-secondary" onClick={() => setShow((v) => !v)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Find it in the Vapi Dashboard under{' '}
              <a
                href="https://dashboard.vapi.ai/org/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline"
              >
                Organization → API Keys
              </a>
              . Use the <strong>private</strong> key (not the public one).
            </p>
          </div>

          <div className="mb-5 max-w-xs">
            <label className="label" htmlFor="cc">
              Default country code
            </label>
            <input
              id="cc"
              type="text"
              className="input"
              placeholder="+1"
              value={ccDraft}
              onChange={(e) => setCcDraft(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-slate-500">
              Applied to phone numbers in your file that don't start with a “+”. Set to your leads'
              country (e.g. +1 US, +44 UK, +91 India).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={onSave} disabled={!keyDraft.trim()}>
              Save
            </button>
            <button
              className="btn-secondary"
              onClick={onTest}
              disabled={!keyDraft.trim() || testing}
            >
              {testing ? <Spinner /> : null}
              {testing ? 'Testing…' : 'Test connection'}
            </button>
          </div>

          {result && (
            <div className="mt-4">
              <Banner type={result.ok ? 'success' : 'error'}>{result.message}</Banner>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
