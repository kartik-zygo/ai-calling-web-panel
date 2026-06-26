// Thin client for the Vapi REST API (https://api.vapi.ai).
//
// NOTE: This runs in the browser, so the private Vapi API key is exposed to
// anyone who can open dev tools on this page. This was an accepted tradeoff for
// an internal/demo tool. For production, move call creation behind a backend.

const BASE_URL = 'https://api.vapi.ai';

export class VapiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'VapiError';
    this.status = status;
    this.body = body;
  }
}

export function createVapiClient(apiKey) {
  if (!apiKey) throw new Error('A Vapi API key is required.');

  async function request(path, { method = 'GET', body, signal } = {}) {
    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (networkErr) {
      throw new VapiError(`Network error contacting Vapi: ${networkErr.message}`, 0, null);
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        `Vapi request failed (${res.status} ${res.statusText})`;
      throw new VapiError(Array.isArray(msg) ? msg.join('; ') : msg, res.status, data);
    }
    return data;
  }

  return {
    // ---- Connection ----
    // Used to validate the API key. A successful list = valid key.
    async testConnection() {
      await request('/assistant?limit=1');
      return true;
    },

    // ---- Assistants ----
    listAssistants({ limit = 100 } = {}) {
      return request(`/assistant?limit=${limit}`);
    },
    getAssistant(id) {
      return request(`/assistant/${id}`);
    },
    createAssistant({
      name,
      systemPrompt,
      firstMessage,
      model = { provider: 'openai', model: 'gpt-4o' },
      voice = { provider: '11labs', voiceId: 'cgSgspJ2msm6clMCkdW9' },
    }) {
      const body = {
        name,
        model: {
          provider: model.provider,
          model: model.model,
          messages: systemPrompt ? [{ role: 'system', content: systemPrompt }] : undefined,
        },
        voice,
        firstMessage,
      };
      return request('/assistant', { method: 'POST', body });
    },

    // ---- Phone numbers ----
    listPhoneNumbers({ limit = 100 } = {}) {
      return request(`/phone-number?limit=${limit}`);
    },
    // Create a free Vapi-provided US number (optionally near an area code).
    createFreePhoneNumber({ areaCode, name, assistantId } = {}) {
      const body = { provider: 'vapi', name };
      if (areaCode) body.numberDesiredAreaCode = String(areaCode);
      if (assistantId) body.assistantId = assistantId;
      return request('/phone-number', { method: 'POST', body });
    },

    // ---- Calls ----
    // Create a single outbound call to one customer, with per-lead overrides.
    createCall({ assistantId, phoneNumberId, customer, variableValues, signal }) {
      const body = {
        assistantId,
        phoneNumberId,
        customer,
      };
      if (variableValues && Object.keys(variableValues).length > 0) {
        body.assistantOverrides = { variableValues };
      }
      return request('/call', { method: 'POST', body, signal });
    },
    getCall(id) {
      return request(`/call/${id}`);
    },
  };
}
