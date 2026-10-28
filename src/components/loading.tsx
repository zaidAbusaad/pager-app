import { useTranslations } from "next-intl";

// Shown while a page's request-time data (like the secret in the URL) loads.
export function Loading() {
  const t = useTranslations("common");
  return <p style={{ padding: 16 }}>{t("loading")}</p>;
}
