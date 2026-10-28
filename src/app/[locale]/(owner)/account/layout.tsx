import { Suspense } from "react";
import { Loading } from "@/components/loading";
import { OwnerShell } from "./owner-shell";

// Wraps every logged-in owner page under /account (branches now, and the
// poster page inside it) in the same navigation. A layout applies to its
// folder and everything nested below it. The menu reads the current address
// (to highlight the open page), which is request-time data, so it sits inside
// <Suspense> like our other request-time pages.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Loading />}>
      <OwnerShell>{children}</OwnerShell>
    </Suspense>
  );
}
