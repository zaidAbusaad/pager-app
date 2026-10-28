// Business-level errors. The service throws these; the HTTP layer decides
// which status code each one becomes. That keeps the rules free of HTTP.
export type DomainErrorCode =
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONFLICT"
  | "UNAUTHORIZED"
  | "NOTHING_TO_CLAIM" // the counter QR was scanned but no order is waiting
  | "ALREADY_CLAIMED" // another phone already linked to that order
  | "INVALID_INPUT"; // the request was understood but a value is not acceptable

// A stable, language-free label for WHY something failed. The server's English
// `message` is for developers and logs; screens translate the `reason` instead,
// so the same error reads correctly in Arabic and English.
export type DomainErrorReason =
  | DomainErrorCode
  | "SHOP_NOT_FOUND"
  | "ORDER_NOT_FOUND"
  | "NUMBER_IN_USE"
  | "ORDER_CHANGED"
  | "REOPEN_NUMBER_TAKEN"
  | "ONLY_PENDING_CANCEL"
  | "NO_OPEN_ORDER"
  | "ALREADY_COLLECTED"
  | "INVALID_EMAIL"
  | "WEAK_PASSWORD"
  | "EMAIL_TAKEN"
  | "INVALID_CREDENTIALS"
  | "INVALID_NAME"
  | "TOO_MANY_BRANCHES"
  | "SLUG_UNAVAILABLE"
  | "BRANCH_NOT_FOUND";

interface DomainErrorOptions {
  reason?: DomainErrorReason; // defaults to the code itself
  number?: number; // the order number the message is about, if any
}

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly reason: DomainErrorReason;
  readonly number?: number;

  constructor(
    code: DomainErrorCode,
    message: string,
    options: DomainErrorOptions = {},
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.reason = options.reason ?? code;
    this.number = options.number;
  }
}
