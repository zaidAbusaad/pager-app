import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { CashierBoard } from "./cashier-board";

// Cashier screens must never show up in Google.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("cashier"), robots: { index: false, follow: false } };
}

export default function CashierPage({
  params,
}: PageProps<"/[locale]/c/[token]">) {
  // `params` is request-time data (it differs per visitor), so we read it
  // inside <Suspense>. Next.js can then send the page shell instantly and
  // fill in the board a moment later.
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ token }) => (
        <CashierBoard token={token} />
      ))}
    </Suspense>
  );
}
