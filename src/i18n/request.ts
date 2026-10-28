import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

// Runs on the server for every request: decides the language and loads that
// language's texts. The language comes from the first URL segment (/ar, /en).
export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const fromUrl = await rootParams.locale();
    if (!hasLocale(routing.locales, fromUrl)) notFound();
    locale = fromUrl;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
