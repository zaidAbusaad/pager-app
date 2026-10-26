"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { unlockAudio } from "@/lib/alert-sound";
import { activeOrderKey, safeStorage } from "@/lib/safe-storage";
import styles from "../../customer.module.css";

type View =
  | { kind: "working" }
  | { kind: "form"; message?: string }
  | { kind: "missing" };

// The page behind the counter QR. It tries, in this order:
//  1. reopen the order this phone already linked,
//  2. link the newest order the cashier just created,
//  3. let the customer type the number the cashier told them.
export function ClaimOrder({ slug, manual }: { slug: string; manual: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  const [view, setView] = useState<View>(
    manual ? { kind: "form" } : { kind: "working" },
  );
  const [shopName, setShopName] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const claim = useCallback(
    async (number?: number) => {
      setBusy(true);
      try {
        const res = await fetch(
          `/api/public/shops/${encodeURIComponent(slug)}/claim`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: number === undefined ? undefined : JSON.stringify({ number }),
          },
        );
        const body = await res.json().catch(() => null);
        if (res.ok && body?.token) {
          unlockAudio(); // the scan/tap is our chance to allow sound later
          safeStorage.set(activeOrderKey(slug), body.token);
          router.replace(`/o/${body.token}`);
          return;
        }
        setView({
          kind: "form",
          message:
            body?.message ?? "Something went wrong. Please try again.",
        });
      } catch {
        setView({
          kind: "form",
          message: "No connection. Please check your internet and try again.",
        });
      }
      setBusy(false);
    },
    [slug, router],
  );

  useEffect(() => {
    // React runs effects twice in development; the ref makes sure we only
    // claim once, otherwise one scan could take two orders.
    if (started.current) return;
    started.current = true;

    (async () => {
      const shopRes = await fetch(
        `/api/public/shops/${encodeURIComponent(slug)}`,
      ).catch(() => null);
      if (!shopRes || !shopRes.ok) return setView({ kind: "missing" });
      setShopName(((await shopRes.json()) as { name: string }).name);

      if (manual) return;

      // 1. Does this phone already have an open order here?
      const stored = safeStorage.get(activeOrderKey(slug));
      if (stored) {
        const res = await fetch(`/api/public/orders/${stored}`, {
          cache: "no-store",
        }).catch(() => null);
        if (res?.ok) {
          const order = (await res.json()) as { status: string };
          if (order.status !== "DONE") {
            router.replace(`/o/${stored}`);
            return;
          }
        }
        safeStorage.remove(activeOrderKey(slug));
      }

      // 2. Take the newest waiting order.
      await claim();
    })();
  }, [slug, manual, claim, router]);

  function submitNumber(event: FormEvent) {
    event.preventDefault();
    const number = Number(typed);
    if (!Number.isInteger(number) || number < 1 || number > 9999) {
      setView({ kind: "form", message: "Enter the number from your receipt." });
      return;
    }
    void claim(number);
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        {view.kind === "working" && (
          <>
            {shopName && <p className={styles.shop}>{shopName}</p>}
            <h1 className={styles.title}>Finding your order…</h1>
            <p className={styles.hint}>One moment.</p>
          </>
        )}

        {view.kind === "missing" && (
          <>
            <h1 className={styles.title}>Shop not found</h1>
            <p className={styles.hint}>
              This QR code is not valid. Please ask the staff.
            </p>
          </>
        )}

        {view.kind === "form" && (
          <>
            {shopName && <p className={styles.shop}>{shopName}</p>}
            <h1 className={styles.title}>Link your order</h1>
            {view.message ? (
              <p className={styles.error} role="alert">
                {view.message}
              </p>
            ) : (
              <p className={styles.hint}>
                Type the order number the cashier gave you.
              </p>
            )}
            <form className={styles.form} onSubmit={submitNumber}>
              <input
                className={styles.input}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder="27"
                aria-label="Order number"
                value={typed}
                onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
                maxLength={4}
              />
              <button className={styles.button} disabled={busy || typed === ""}>
                {busy ? "Linking…" : "Link my order"}
              </button>
            </form>
            <button
              className={styles.quiet}
              disabled={busy}
              onClick={() => void claim()}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </main>
  );
}
