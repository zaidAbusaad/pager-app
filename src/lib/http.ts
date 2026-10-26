import { ZodError } from "zod";
import { DomainError, type DomainErrorCode } from "@/domain/errors";

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  CONFLICT: 409,
  UNAUTHORIZED: 401,
  NOTHING_TO_CLAIM: 404,
  ALREADY_CLAIMED: 409,
};

// Reads a JSON body, but treats an empty body as {} (so "no options" works).
// Invalid JSON throws a SyntaxError, which handle() turns into a 400.
export async function readOptionalJson(request: Request): Promise<unknown> {
  const text = await request.text();
  return text.trim() === "" ? {} : JSON.parse(text);
}

// Wraps a route's logic and turns thrown errors into proper JSON responses,
// so each route does not repeat the same try/catch.
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "VALIDATION_ERROR", issues: error.issues },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      // request.json() throws this when the body is not valid JSON
      return Response.json({ error: "INVALID_JSON" }, { status: 400 });
    }
    if (error instanceof DomainError) {
      return Response.json(
        { error: error.code, message: error.message },
        { status: STATUS_BY_CODE[error.code] },
      );
    }
    console.error(error);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
