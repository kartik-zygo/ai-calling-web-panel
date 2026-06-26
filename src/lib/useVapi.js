import { useMemo } from 'react';
import { useStore } from '../store/useStore.js';
import { createVapiClient } from './vapi.js';

// Returns a memoized Vapi client bound to the stored API key, or null if no key.
export function useVapi() {
  const apiKey = useStore((s) => s.apiKey);
  return useMemo(() => (apiKey ? createVapiClient(apiKey) : null), [apiKey]);
}
