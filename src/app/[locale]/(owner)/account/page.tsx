import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Account } from "./account";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("account"), robots: { index: false, follow: false } };
}

export default function Page() {
  return <Account />;
}
