import { NavLink, Outlet } from 'react-router-dom';
import { useStore, selectValidLeads } from '../store/useStore.js';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/settings', label: 'Settings', icon: '🔑', step: 1 },
  { to: '/assistants', label: 'Assistant', icon: '🤖', step: 2 },
  { to: '/phone-numbers', label: 'Phone Number', icon: '📞', step: 3 },
  { to: '/leads', label: 'Leads', icon: '📋', step: 4 },
  { to: '/campaign', label: 'Campaign', icon: '🚀', step: 5 },
];

function StepDot({ done }) {
  return (
    <span
      className={`ml-auto h-2.5 w-2.5 rounded-full ${
        done ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
      title={done ? 'Ready' : 'Not configured'}
    />
  );
}

export default function Layout() {
  const apiKey = useStore((s) => s.apiKey);
  const assistant = useStore((s) => s.assistant);
  const phoneNumber = useStore((s) => s.phoneNumber);
  const validLeads = useStore(selectValidLeads);

  const status = {
    1: Boolean(apiKey),
    2: Boolean(assistant?.id),
    3: Boolean(phoneNumber?.id),
    4: validLeads.length > 0,
    5: Boolean(apiKey && assistant?.id && phoneNumber?.id && validLeads.length > 0),
  };

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">
            ☎
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-slate-900">Leads AI Caller</div>
            <div className="text-xs text-slate-500">Vapi outbound panel</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
              {item.step && <StepDot done={status[item.step]} />}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-400">
          Powered by Vapi.ai
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
