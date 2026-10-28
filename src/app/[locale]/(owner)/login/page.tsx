import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "../auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("login") };
}

export default function Page() {
  return <AuthForm mode="login" />;
}
