import { Link } from 'react-router-dom';
import { useStore, selectValidLeads } from '../store/useStore.js';
import { PageHeader, Banner } from '../components/ui.jsx';

const STEPS = [
  {
    to: '/settings',
    icon: '🔑',
    title: '1. Connect Vapi',
    desc: 'Paste your private Vapi API key and set a default country code.',
    check: (s) => Boolean(s.apiKey),
  },
  {
    to: '/assistants',
    icon: '🤖',
    title: '2. Pick an assistant',
    desc: 'Create or select the AI agent that will talk to your leads.',
    check: (s) => Boolean(s.assistant?.id),
  },
  {
    to: '/phone-numbers',
    icon: '📞',
    title: '3. Get a phone number',
    desc: 'Provision a free US number or import one from Twilio.',
    check: (s) => Boolean(s.phoneNumber?.id),
  },
  {
    to: '/leads',
    icon: '📋',
    title: '4. Upload leads',
    desc: 'Drop in a CSV/Excel file; we extract and validate the rows.',
    check: (s) => selectValidLeads(s).length > 0,
  },
  {
    to: '/campaign',
    icon: '🚀',
    title: '5. Run the campaign',
    desc: 'Place AI calls and watch live status & outcomes.',
    check: (s) =>
      Boolean(s.apiKey && s.assistant?.id && s.phoneNumber?.id && selectValidLeads(s).length > 0),
  },
];

export default function DashboardPage() {
  const state = useStore();
  const validLeads = useStore(selectValidLeads);
  const doneCount = STEPS.filter((step) => step.check(state)).length;

  return (
    <div>
      <PageHeader
        title="Welcome 👋"
        subtitle="Upload your leads and run AI-powered outbound phone calls with Vapi."
      />

      <div className="mb-6">
        <Banner type="info" title={`Setup progress: ${doneCount}/${STEPS.length}`}>
          Follow the steps below in order. Each turns green once configured.
        </Banner>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => {
          const done = step.check(state);
          return (
            <Link
              key={step.to}
              to={step.to}
              className={`group rounded-xl border p-5 transition hover:shadow-md ${
                done ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl">{step.icon}</div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {done ? 'Done' : 'Pending'}
                </span>
              </div>
              <div className="mt-3 font-semibold text-slate-900 group-hover:text-brand-700">
                {step.title}
              </div>
              <div className="mt-1 text-sm text-slate-500">{step.desc}</div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Assistant" value={state.assistant?.name || 'Not selected'} />
        <MiniStat label="From number" value={state.phoneNumber?.label || 'Not selected'} />
        <MiniStat label="Valid leads" value={validLeads.length} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 truncate text-lg font-semibold text-slate-800">{value}</div>
    </div>
  );
}
