/** Keeps digits only and drops the Mongolian country code (+976 / 976 / 00976). */
export function normalizePhone(input: string): string {
  let d = (input ?? '').replace(/\D/g, '');
  if (d.startsWith('00976')) d = d.slice(5);
  else if (d.startsWith('976') && d.length === 11) d = d.slice(3);
  return d;
}

export const MIN_PHONE_LENGTH = 6;

export function isValidPhone(input: string): boolean {
  const d = normalizePhone(input);
  return d.length >= MIN_PHONE_LENGTH && d.length <= 12;
}

/** 99112233 -> "9911 2233" for display. */
export function formatPhone(phone: string): string {
  return phone.length === 8 ? `${phone.slice(0, 4)} ${phone.slice(4)}` : phone;
}
