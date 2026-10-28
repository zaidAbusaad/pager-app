import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { ClaimOrder } from "./claim-order";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("claim"), robots: { index: false, follow: false } };
}

export default function ShopPage({
  params,
  searchParams,
}: PageProps<"/[locale]/s/[slug]">) {
  // Both are request-time data, so they are read inside <Suspense>.
  // ?manual=1 skips the automatic claim (used after "Not my order").
  return (
    <Suspense fallback={<Loading />}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <ClaimOrder slug={slug} manual={query.manual === "1"} />
      ))}
    </Suspense>
  );
}
