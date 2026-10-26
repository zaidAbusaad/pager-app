import type { Metadata } from "next";
import { Suspense } from "react";
import { ClaimOrder } from "./claim-order";

export const metadata: Metadata = {
  title: "Find your order",
  robots: { index: false, follow: false },
};

export default function ShopPage({
  params,
  searchParams,
}: PageProps<"/s/[slug]">) {
  // Both are request-time data, so they are read inside <Suspense>.
  // ?manual=1 skips the automatic claim (used after "Not my order").
  return (
    <Suspense fallback={<p style={{ padding: 16 }}>Loading…</p>}>
      {Promise.all([params, searchParams]).then(([{ slug }, query]) => (
        <ClaimOrder slug={slug} manual={query.manual === "1"} />
      ))}
    </Suspense>
  );
}
