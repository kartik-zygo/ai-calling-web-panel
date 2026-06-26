// Lightweight E.164 phone normalization & validation.
//
// We intentionally avoid a heavy dependency like libphonenumber. The rules:
//  - Strip spaces, dashes, parentheses, dots.
//  - A leading "00" is treated as the international "+" prefix.
//  - If the number already starts with "+", keep it.
//  - Otherwise, if a defaultCountryCode (e.g. "+1") is provided, prepend it.
//  - Validate against a permissive E.164 shape: + followed by 8–15 digits.

export function normalizePhone(raw, defaultCountryCode = '') {
  if (raw == null) return { ok: false, value: '', reason: 'empty' };

  let s = String(raw).trim();
  if (!s) return { ok: false, value: '', reason: 'empty' };

  // Excel sometimes yields "1.4155552671e10" or trailing ".0"
  s = s.replace(/\.0+$/, '');

  // Keep a leading + then strip every non-digit.
  const hasPlus = s.startsWith('+');
  let digits = s.replace(/[^\d]/g, '');

  if (!hasPlus && digits.startsWith('00')) {
    digits = digits.slice(2);
    return finalize('+' + digits);
  }

  if (hasPlus) {
    return finalize('+' + digits);
  }

  // No country indicator — apply the default if we have one.
  const cc = (defaultCountryCode || '').replace(/[^\d]/g, '');
  if (cc) {
    // Avoid double-prepending if the user already included the country code.
    if (digits.startsWith(cc)) return finalize('+' + digits);
    return finalize('+' + cc + digits);
  }

  return { ok: false, value: '+' + digits, reason: 'no-country-code' };
}

function finalize(e164) {
  const ok = /^\+\d{8,15}$/.test(e164);
  return {
    ok,
    value: e164,
    reason: ok ? null : 'invalid-format',
  };
}

export function reasonText(reason) {
  switch (reason) {
    case 'empty':
      return 'Phone number is empty';
    case 'no-country-code':
      return 'No country code (+). Set a default country code in Settings or use E.164 format.';
    case 'invalid-format':
      return 'Not a valid international number (expected + and 8–15 digits)';
    default:
      return 'Invalid phone number';
  }
}
