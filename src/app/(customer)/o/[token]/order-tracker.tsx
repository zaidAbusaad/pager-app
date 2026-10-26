"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { playChime, unlockAudio, vibrate } from "@/lib/alert-sound";
import { activeOrderKey, safeStorage } from "@/lib/safe-storage";
import styles from "../../customer.module.css";

type PublicOrder = {
  token: string;
  number: number;
  status: "PREPARING" | "READY" | "DONE";
  shopName: string;
  shopSlug: string;
};

const POLL_MS = 3000;

export function OrderTracker({ token }: { token: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [missing, setMissing] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [releasing, setReleasing] = useState(false);

  // Ask the server for the latest status (also called on a timer).
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/orders/${token}`, {
        cache: "no-store",
      });
      if (res.status === 404 || res.status === 400) return setMissing(true);
      if (!res.ok) return; // temporary problem: keep showing the last status
      setOrder((await res.json()) as PublicOrder);
    } catch {
      /* offline for a moment: try again next tick */
    }
  }, [token]);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Remember this order on this phone, so scanning the counter QR again
  // reopens it. Forget it once collected, or if the link stopped working.
  const shopSlug = order?.shopSlug;
  const status = order?.status;
  useEffect(() => {
    if (!shopSlug || !status) return;
    if (status === "DONE") safeStorage.remove(activeOrderKey(shopSlug));
    else safeStorage.set(activeOrderKey(shopSlug), token);
  }, [shopSlug, status, token]);

  // Ring while the order is READY (every 4s until it is collected).
  useEffect(() => {
    if (status !== "READY") return;
    const ring = () => {
      playChime();
      vibrate();
    };
    ring();
    const timer = setInterval(ring, 4000);
    return () => clearInterval(timer);
  }, [status]);

  // Show the status in the browser tab title too.
  useEffect(() => {
    if (!order) return;
    document.title =
      order.status === "READY"
        ? `READY - #${order.number}`
        : `#${order.number} - ${order.shopName}`;
  }, [order]);

  // Keep the screen awake while waiting (where the browser supports it).
  useEffect(() => {
    if (status !== "PREPARING" && status !== "READY") return;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        /* denied or unsupported: fine */
      }
    };
    void acquire();
    const again = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      void lock?.release();
    };
  }, [status]);

  function enableSound() {
    setSoundOn(unlockAudio());
    playChime(); // short test so the customer hears that it works
  }

  // "Not my order": let go of it so the rightful customer can claim it.
  async function release() {
    if (!order || releasing) return;
    setReleasing(true);
    try {
      const res = await fetch(`/api/public/orders/${token}/release`, {
        method: "POST",
      });
      if (!res.ok && res.status !== 404) throw new Error();
      safeStorage.remove(activeOrderKey(order.shopSlug));
      router.replace(`/s/${order.shopSlug}?manual=1`);
    } catch {
      setReleasing(false);
    }
  }

  if (missing) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Order not found</h1>
          <p className={styles.hint}>
            This link is no longer valid. Please ask the cashier for your QR.
          </p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.hint}>Loading…</p>
        </div>
      </main>
    );
  }

  const state = order.status.toLowerCase();

  return (
    <main className={styles.page}>
      <div className={styles.card} data-state={state}>
        <p className={styles.shop}>{order.shopName}</p>
        <div className={styles.number} aria-label={`Order number ${order.number}`}>
          <span className={styles.hash}>#</span>
          {order.number}
        </div>

        {order.status === "PREPARING" && (
          <>
            <p className={styles.status} data-state={state}>
              Being prepared…
            </p>
            <p className={styles.hint}>
              Keep this page open. We will ring when it is ready.
            </p>
            {!soundOn && (
              <button className={styles.button} onClick={enableSound}>
                Turn on sound
              </button>
            )}
            <button
              className={styles.quiet}
              onClick={release}
              disabled={releasing}
            >
              Not my order?
            </button>
          </>
        )}

        {order.status === "READY" && (
          <>
            <p className={styles.status} data-state={state}>
              Your order is ready!
            </p>
            <p className={styles.hint}>Please collect it at the counter.</p>
          </>
        )}

        {order.status === "DONE" && (
          <>
            <p className={styles.status}>Collected</p>
            <p className={styles.hint}>Thank you, enjoy!</p>
          </>
        )}
      </div>
    </main>
  );
}
