// Business-level errors. The service throws these; the HTTP layer decides
// which status code each one becomes. That keeps the rules free of HTTP.
export type DomainErrorCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "NOTHING_TO_CLAIM" // the counter QR was scanned but no order is waiting
  | "ALREADY_CLAIMED"; // another phone already linked to that order

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
