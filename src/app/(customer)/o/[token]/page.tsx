import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderTracker } from "./order-tracker";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default function OrderPage({ params }: PageProps<"/o/[token]">) {
  return (
    <Suspense fallback={<p style={{ padding: 16 }}>Loading…</p>}>
      {params.then(({ token }) => (
        <OrderTracker token={token} />
      ))}
    </Suspense>
  );
}
