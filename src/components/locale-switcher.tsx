"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import styles from "./locale-switcher.module.css";

// One small button that flips between Arabic and English on the same page.
// The button's own text is the OTHER language, written in that language.
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname(); // the path without the language prefix
  const other: Locale = locale === "ar" ? "en" : "ar";

  function switchLanguage() {
    // Keep the query string (for example ?manual=1) when switching.
    router.replace(`${pathname}${window.location.search}`, { locale: other });
  }

  return (
    <button
      type="button"
      className={styles.switcher}
      lang={other}
      onClick={switchLanguage}
    >
      {t("switchTo")}
    </button>
  );
}
