// A shop owner: the person who pays, logs in on the website, and manages
// one or more branches (shops). Staff at the counter do NOT have accounts;
// they use the secret cashier link of a branch.
export interface Owner {
  id: string;
  email: string;
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

export function isAcceptablePassword(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}
