import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Use these instead of next/link and next/navigation: they keep the current
// language in the URL (/ar/c/... stays /ar/c/... after a redirect).
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
