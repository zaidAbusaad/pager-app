import { DomainError } from "@/domain/errors";

// A second wall against "cross-site request forgery": another website making
// your browser send a request to Pagerly while you are logged in. The session
// cookie is already SameSite=Lax, which stops that in modern browsers. This
// check adds a second layer: browsers attach an `Origin` header (the website
// the request came from) to every POST/PATCH/DELETE. If it names a different
// website than the one being asked, we refuse.
//
// No Origin header at all means the request did not come from a web page
// (curl, a script): those cannot ride on a victim's cookie, so they pass.
export function assertSameOrigin(request: { headers: Pick<Headers, "get"> }): void {
  const origin = request.headers.get("origin");
  if (origin === null) return;

  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host; // "null" (sandboxed pages) throws: refused
  } catch {
    originHost = null;
  }

  if (originHost === null || originHost !== request.headers.get("host")) {
    throw new DomainError("FORBIDDEN", "Cross-site request refused");
  }
}
