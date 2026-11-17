import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

// Passwords are chosen by humans, so they are short and guessable. We store
// them with scrypt: a hash that is deliberately slow and memory-hungry, which
// makes guessing millions of passwords against a stolen database very costly.
// (Compare: cashier tokens are 256 random bits, so plain SHA-256 is enough.)
//
// A random "salt" per password means two owners with the same password get
// different hashes, so one cracked hash does not reveal the others.
//
// Stored format:  scrypt$<N>$<r>$<p>$<salt>$<hash>   (all in one text column;
// the settings travel with the hash so we can make it stronger later).
const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function derive(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { N: n, r, p }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

// TEMPORARY passwords set by hand in the Neon SQL Editor (see docs/DEPLOY.md).
// Postgres cannot compute scrypt, but it can compute this in one query:
//   'sha256$' || salt || '$' || encode(sha256(convert_to(salt || password, 'UTF8')), 'hex')
// It is much weaker than scrypt, which is fine only because the account is
// flagged mustChangePassword and the owner replaces it with a real (scrypt)
// password at their first login. The login service refuses this format on any
// account that is not flagged.
export const TEMPORARY_HASH_PREFIX = "sha256$";

function verifyTemporary(password: string, stored: string): boolean {
  const [, salt, hex] = stored.split("$");
  if (!salt || !hex) return false;
  const actual = createHash("sha256").update(salt + password, "utf8").digest();
  const expected = Buffer.from(hex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (stored.startsWith(TEMPORARY_HASH_PREFIX)) return verifyTemporary(password, stored);
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p));
  // timingSafeEqual compares in constant time, so response time cannot leak
  // how many leading bytes were right.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// For admin resets: 12 characters in three groups (like k7Qm-x2Vp-9TnA).
// No look-alikes (0/O, 1/l/I), so it survives being read out or retyped from
// WhatsApp. About 62 bits of randomness, and the owner must replace it at once.
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateTemporaryPassword(): string {
  const group = () =>
    Array.from({ length: 4 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}
