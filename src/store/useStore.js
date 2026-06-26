import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { validateRow } from '../lib/parseFile.js';

// Global application state, persisted to localStorage so the panel survives
// page reloads (API key, selected assistant/number, uploaded leads, call state).
export const useStore = create(
  persist(
    (set, get) => ({
      // --- Connection / settings ---
      apiKey: '',
      defaultCountryCode: '+1',
      setApiKey: (apiKey) => set({ apiKey: apiKey.trim() }),
      setDefaultCountryCode: (defaultCountryCode) => {
        set({ defaultCountryCode });
        // Re-validate phones with the new default country code.
        const cc = defaultCountryCode;
        set({ leads: get().leads.map((l) => validateRow({ ...l }, cc)) });
      },

      // --- Selected assistant & phone number ---
      assistant: null, // { id, name }
      phoneNumber: null, // { id, label }
      setAssistant: (assistant) => set({ assistant }),
      setPhoneNumber: (phoneNumber) => set({ phoneNumber }),

      // --- Leads ---
      leads: [],
      leadsMeta: null, // { fileName, headers, customKeys, missingRequired }
      setLeads: (parseResult) =>
        set({
          leads: parseResult.rows,
          leadsMeta: {
            fileName: parseResult.fileName,
            headers: parseResult.headers,
            customKeys: parseResult.customKeys,
            missingRequired: parseResult.missingRequired,
          },
          calls: {},
        }),
      updateLead: (id, patch) =>
        set({
          leads: get().leads.map((l) =>
            l.id === id ? validateRow({ ...l, ...patch }, get().defaultCountryCode) : l
          ),
        }),
      removeLead: (id) =>
        set({
          leads: get().leads.filter((l) => l.id !== id),
          calls: omitKey(get().calls, id),
        }),
      clearLeads: () => set({ leads: [], leadsMeta: null, calls: {} }),

      // --- Calls (keyed by lead id) ---
      // { [leadId]: { callId, status, endedReason, cost, error, startedAt, updatedAt } }
      calls: {},
      setCall: (leadId, patch) =>
        set({
          calls: {
            ...get().calls,
            [leadId]: { ...(get().calls[leadId] || {}), ...patch, updatedAt: Date.now() },
          },
        }),
      resetCalls: () => set({ calls: {} }),

      // --- Campaign runtime flag (not persisted in a meaningful way) ---
      campaignRunning: false,
      setCampaignRunning: (campaignRunning) => set({ campaignRunning }),
    }),
    {
      name: 'leads-ai-calling-panel',
      partialize: (state) => ({
        apiKey: state.apiKey,
        defaultCountryCode: state.defaultCountryCode,
        assistant: state.assistant,
        phoneNumber: state.phoneNumber,
        leads: state.leads,
        leadsMeta: state.leadsMeta,
        calls: state.calls,
      }),
    }
  )
);

function omitKey(obj, key) {
  const { [key]: _removed, ...rest } = obj;
  return rest;
}

// Convenience selectors
export const selectValidLeads = (state) => state.leads.filter((l) => l.valid);
export const selectIsConnected = (state) => Boolean(state.apiKey);
export const selectIsReadyToCall = (state) =>
  Boolean(state.apiKey && state.assistant?.id && state.phoneNumber?.id && state.leads.some((l) => l.valid));
