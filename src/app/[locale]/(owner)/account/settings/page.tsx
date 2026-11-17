import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Settings } from "./settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("settings"), robots: { index: false, follow: false } };
}

export default function Page() {
  return <Settings />;
}
