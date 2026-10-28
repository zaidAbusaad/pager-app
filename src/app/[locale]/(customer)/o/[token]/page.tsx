import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { OrderTracker } from "./order-tracker";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("order"), robots: { index: false, follow: false } };
}

export default function OrderPage({
  params,
}: PageProps<"/[locale]/o/[token]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ token }) => (
        <OrderTracker token={token} />
      ))}
    </Suspense>
  );
}
