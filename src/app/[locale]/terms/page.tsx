import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalPage } from "../_site/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("terms") };
}

export default function Page() {
  return <LegalPage document="terms" />;
}
