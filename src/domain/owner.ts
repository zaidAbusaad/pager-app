// A shop owner: the person who pays, logs in on the website, and manages
// one or more branches (shops). Staff at the counter do NOT have accounts;
// they use the secret cashier link of a branch.
export interface Owner {
  id: string;
  email: string;
  // Paid until this moment; null = not activated yet (src/domain/subscription.ts).
  activeUntil: Date | null;
  // Contact number in the form +9627XXXXXXXX, or null when not given.
  phone: string | null;
  // True after an admin reset: only the change-password screen may be used.
  mustChangePassword: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;
// scrypt hashing is deliberately slow, so we refuse absurdly long input
// instead of letting someone make the server hash a 10 MB "password".
export const MAX_PASSWORD_LENGTH = 128;

// "  Ali@Mail.COM " and "ali@mail.com" must be the same account.
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Deliberately simple: one "@", something on both sides, a dot in the domain.
// The only real proof an address works is sending an email to it (later).
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Jordanian mobile numbers only for now. Accepts how people really write them
// (0791234567, 791234567, +962 79 123 4567, 00962..., Arabic digits) and
// returns the one stored form +962791234567, or null when it is not valid.
export function normalizePhone(raw: string): string | null {
  let digits = raw
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("962")) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return /^7[789]\d{7}$/.test(digits) ? `+962${digits}` : null;
}

export function isAcceptablePassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}
