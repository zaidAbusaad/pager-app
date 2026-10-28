import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthForm } from "../auth-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("signup") };
}

export default function Page() {
  return <AuthForm mode="signup" />;
}
