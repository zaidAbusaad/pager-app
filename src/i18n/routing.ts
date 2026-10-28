import { defineRouting } from "next-intl/routing";

// Every page lives under /ar/... or /en/.... Arabic is the default because the
// product is built for Jordan. The proxy picks a language for visitors from
// their saved choice, then their browser language, then this default.
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
});

export type Locale = (typeof routing.locales)[number];

// Arabic is written right-to-left; the page direction follows the language.
export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
