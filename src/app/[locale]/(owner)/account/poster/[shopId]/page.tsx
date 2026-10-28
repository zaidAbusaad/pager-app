import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { PosterEditor } from "./poster-editor";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("poster"), robots: { index: false, follow: false } };
}

export default function Page({ params }: PageProps<"/[locale]/account/poster/[shopId]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ shopId }) => (
        <PosterEditor shopId={shopId} />
      ))}
    </Suspense>
  );
}
