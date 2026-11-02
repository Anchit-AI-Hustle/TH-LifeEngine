// Mobile numbers are the account identifier. Everything is stored and compared
// in E.164 form ("+919876543210") so every way of typing a number maps to one
// account.
//
// Accepted input:
// - an Indian mobile: 10 digits starting 6-9, optionally written with a
//   leading 0, 91 or +91, and with spaces, dashes, dots or brackets;
// - any other country: "+" then the country code and number, 8-15 digits.

export function normalizeMobile(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 24) return null;
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const international = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (international) {
    if (digits.startsWith('91')) return indian(digits.slice(2));
    return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null;
  }
  if (digits.length === 10) return indian(digits);
  if (digits.length === 11 && digits.startsWith('0')) return indian(digits.slice(1));
  if (digits.length === 12 && digits.startsWith('91')) return indian(digits.slice(2));
  return null;
}

function indian(ten: string): string | null {
  return /^[6-9]\d{9}$/.test(ten) ? `+91${ten}` : null;
}

/** "+91 ••••• •5238": enough to recognise your own number, not to read it. */
export function maskMobile(e164: string): string {
  const last4 = e164.slice(-4);
  if (e164.startsWith('+91')) return `+91 ••••• •${last4}`;
  return `${e164.slice(0, 3)}•••••${last4}`;
}

export const MOBILE_HELP = 'Enter a 10-digit mobile number, or + and the country code for numbers outside India.';
