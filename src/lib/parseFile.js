// Parse an uploaded CSV or Excel file into normalized lead rows.
//
// Returns a Promise resolving to:
// {
//   headers:       string[]            // canonical/custom keys, in file order
//   rawHeaders:    string[]            // original header strings
//   customKeys:    string[]            // extra (non-schema) column keys
//   missingRequired: string[]          // required keys not found in the file
//   rows:          LeadRow[]           // see makeLeadRow
//   fileName:      string
// }
//
// Each LeadRow:
// {
//   id, name, phone, phoneNormalized, phoneValid, phoneError,
//   email, company, custom: { [key]: value },
//   errors: string[], valid: boolean, _row: number
// }

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { canonicalizeHeader, REQUIRED_KEYS, KNOWN_KEYS } from './schema.js';
import { normalizePhone, reasonText } from './phone.js';

let _idCounter = 0;
const nextId = () => `lead_${Date.now().toString(36)}_${(_idCounter++).toString(36)}`;

function readCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: 'greedy',
      complete: (res) => resolve(res.data),
      error: (err) => reject(err),
    });
  });
}

async function readExcel(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheet];
  // raw:false -> formatted strings (keeps leading +, avoids sci-notation surprises)
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
}

export async function parseLeadFile(file, { defaultCountryCode = '' } = {}) {
  const name = file.name.toLowerCase();
  let matrix;
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    matrix = await readCsv(file);
  } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    matrix = await readExcel(file);
  } else {
    throw new Error('Unsupported file type. Please upload a .csv, .xlsx, or .xls file.');
  }

  // Drop fully-empty leading rows, find the header row.
  const cleaned = matrix.filter((r) => Array.isArray(r) && r.some((c) => String(c ?? '').trim() !== ''));
  if (cleaned.length === 0) {
    throw new Error('The file appears to be empty.');
  }

  const rawHeaders = cleaned[0].map((h) => String(h ?? '').trim());
  const dataRows = cleaned.slice(1);

  // Map each column index to a canonical/custom key.
  const colMeta = rawHeaders.map((h) => {
    const { key, custom } = canonicalizeHeader(h);
    return { rawHeader: h, key, custom };
  });

  // Detect duplicate keys (e.g. two columns both mapping to "phone").
  const seen = new Set();
  for (const m of colMeta) {
    if (seen.has(m.key)) {
      m.key = `${m.key}_${seen.size}`;
      m.custom = true;
    }
    seen.add(m.key);
  }

  const headerKeys = colMeta.map((m) => m.key);
  const customKeys = colMeta.filter((m) => m.custom && !KNOWN_KEYS.includes(m.key)).map((m) => m.key);
  const missingRequired = REQUIRED_KEYS.filter((k) => !headerKeys.includes(k));

  const rows = dataRows.map((cells, i) => {
    const record = {};
    colMeta.forEach((m, idx) => {
      record[m.key] = String(cells[idx] ?? '').trim();
    });
    return makeLeadRow(record, customKeys, defaultCountryCode, i + 2);
  });

  return {
    headers: headerKeys,
    rawHeaders,
    customKeys,
    missingRequired,
    rows,
    fileName: file.name,
  };
}

export function makeLeadRow(record, customKeys, defaultCountryCode, rowNumber) {
  const custom = {};
  for (const k of customKeys) {
    if (record[k] !== undefined) custom[k] = record[k];
  }

  const phoneRes = normalizePhone(record.phone, defaultCountryCode);

  const row = {
    id: nextId(),
    name: record.name || '',
    phone: record.phone || '',
    phoneNormalized: phoneRes.value,
    phoneValid: phoneRes.ok,
    phoneError: phoneRes.ok ? null : reasonText(phoneRes.reason),
    email: record.email || '',
    company: record.company || '',
    custom,
    _row: rowNumber,
  };
  return validateRow(row);
}

// Recompute validity (used after inline edits).
export function validateRow(row, defaultCountryCode = '') {
  const errors = [];
  if (!row.name || !row.name.trim()) errors.push('Missing name');

  const phoneRes = normalizePhone(row.phone, defaultCountryCode);
  row.phoneNormalized = phoneRes.value;
  row.phoneValid = phoneRes.ok;
  row.phoneError = phoneRes.ok ? null : reasonText(phoneRes.reason);
  if (!phoneRes.ok) errors.push(row.phoneError);

  row.errors = errors;
  row.valid = errors.length === 0;
  return row;
}
