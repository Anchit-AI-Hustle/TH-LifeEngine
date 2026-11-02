// PIN rules shared by the sign-up form and the server. No Node APIs here, so
// the browser can import it.
export const PIN_LEN = 4;
export const PIN_RE = /^\d{4}$/;

export function isPinShape(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_RE.test(pin);
}

// The PINs a thief tries first.
const WEAK = new Set([
  '1234', '4321', '1212', '1122', '2580', '0852', '1004', '2000', '2020',
  '6969', '1313', '2468', '1357', '0123', '9876', '5683', '7777', '1010',
  '2121', '1111', '0000', '2001', '1990', '1230', '0007',
]);

/** Why a PIN may not be chosen, or null when it is fine. */
export function pinProblem(pin: string, mobileE164?: string): string | null {
  if (!PIN_RE.test(pin)) return 'A PIN is exactly 4 numbers.';
  let up = true;
  let down = true;
  for (let i = 1; i < pin.length; i++) {
    if (+pin[i] !== +pin[i - 1] + 1) up = false;
    if (+pin[i] !== +pin[i - 1] - 1) down = false;
  }
  if (WEAK.has(pin) || /^(\d)\1+$/.test(pin) || up || down) {
    return 'That PIN is one of the first anyone would try. Please pick another.';
  }
  if (mobileE164 && mobileE164.endsWith(pin)) {
    return 'Please do not use the last 4 digits of your mobile number as your PIN.';
  }
  // Years from 1940 to 2029 are birthdays and anniversaries.
  if (/^(19[4-9]\d|20[0-2]\d)$/.test(pin)) return 'That PIN looks like a year. Please pick another.';
  return null;
}
