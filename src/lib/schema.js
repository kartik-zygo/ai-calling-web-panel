// Lead schema definition.
//
// This is the single source of truth for what columns the uploaded CSV / Excel
// file must contain. Headers are matched case-insensitively and trimmed.
//
// - `required: true`  -> the upload is rejected if the column is missing.
// - `key`             -> normalized field name used internally.
// - `aliases`         -> alternative header spellings accepted from the file.
//
// Any extra columns in the file that are NOT listed here are preserved as
// "custom variables" and passed to the Vapi assistant as variableValues so the
// prompt can reference them with {{column_name}}.

export const LEAD_COLUMNS = [
  {
    key: 'name',
    label: 'name',
    required: true,
    aliases: ['name', 'full name', 'fullname', 'contact', 'contact name', 'lead name'],
    description: 'Person to call. Used as {{name}} in the assistant prompt.',
    example: 'Jane Cooper',
  },
  {
    key: 'phone',
    label: 'phone',
    required: true,
    aliases: ['phone', 'phone number', 'phonenumber', 'mobile', 'number', 'cell', 'contact number'],
    description: 'Destination number. Best in E.164 format, e.g. +14155552671.',
    example: '+14155552671',
  },
  {
    key: 'email',
    label: 'email',
    required: false,
    aliases: ['email', 'email address', 'e-mail'],
    description: 'Optional. Available to the assistant as {{email}}.',
    example: 'jane@example.com',
  },
  {
    key: 'company',
    label: 'company',
    required: false,
    aliases: ['company', 'company name', 'organization', 'organisation', 'business'],
    description: 'Optional. Available to the assistant as {{company}}.',
    example: 'Zygonich',
  },
];

export const REQUIRED_KEYS = LEAD_COLUMNS.filter((c) => c.required).map((c) => c.key);
export const KNOWN_KEYS = LEAD_COLUMNS.map((c) => c.key);

// Build a lookup from any accepted header (lowercased) -> canonical key.
const ALIAS_TO_KEY = (() => {
  const map = {};
  for (const col of LEAD_COLUMNS) {
    for (const alias of col.aliases) {
      map[alias.toLowerCase().trim()] = col.key;
    }
  }
  return map;
})();

// Map a raw header from the file to a canonical key, or return a sanitized
// custom-variable key (e.g. "Plan Type" -> "plan_type").
export function canonicalizeHeader(rawHeader) {
  const cleaned = String(rawHeader ?? '').trim();
  const lower = cleaned.toLowerCase();
  if (ALIAS_TO_KEY[lower]) {
    return { key: ALIAS_TO_KEY[lower], custom: false };
  }
  const slug = lower.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return { key: slug || 'field', custom: true };
}

// Header row used for the downloadable template.
export const TEMPLATE_HEADERS = ['name', 'phone', 'email', 'company'];

export const TEMPLATE_ROWS = [
  ['Jane Cooper', '+14155552671', 'jane@example.com', 'Acme Inc'],
  ['Carlos Diaz', '+447911123456', 'carlos@example.com', 'Globex'],
];

export function buildTemplateCsv() {
  const lines = [TEMPLATE_HEADERS.join(',')];
  for (const row of TEMPLATE_ROWS) {
    lines.push(row.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(','));
  }
  return lines.join('\n');
}
