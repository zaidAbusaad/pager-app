import type { Metadata } from "next";
import { Suspense } from "react";
import { CashierBoard } from "./cashier-board";

// Cashier screens must never show up in Google.
export const metadata: Metadata = {
  title: "Cashier",
  robots: { index: false, follow: false },
};

export default function CashierPage({ params }: PageProps<"/c/[token]">) {
  // `params` is request-time data (it differs per visitor), so we read it
  // inside <Suspense>. Next.js can then send the page shell instantly and
  // fill in the board a moment later.
  return (
    <Suspense fallback={<p style={{ padding: 16 }}>Loading…</p>}>
      {params.then(({ token }) => (
        <CashierBoard token={token} />
      ))}
    </Suspense>
  );
}
