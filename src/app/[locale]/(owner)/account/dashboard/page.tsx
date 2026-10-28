import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Dashboard } from "./dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("dashboard"), robots: { index: false, follow: false } };
}

export default function Page() {
  return <Dashboard />;
}
