import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// The "proxy" runs before every page request. It sends /c/<secret> to
// /ar/c/<secret> (or /en/...) depending on the visitor's saved language or
// browser language. That way the printed QR code holds ONE neutral address and
// every customer still lands on their own language.
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
