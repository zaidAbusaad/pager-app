"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useRouter } from "@/i18n/navigation";
import { playChime, unlockAudio, vibrate } from "@/lib/alert-sound";
import { activeOrderKey, safeStorage } from "@/lib/safe-storage";
import styles from "../../customer.module.css";

type PublicOrder = {
  token: string;
  number: number;
  status: "PREPARING" | "READY" | "DONE" | "CANCELLED";
  shopName: string;
  shopSlug: string;
};

const POLL_MS = 3000;

export function OrderTracker({ token }: { token: string }) {
  const t = useTranslations("tracker");
  const tCommon = useTranslations("common");
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
    if (status === "DONE" || status === "CANCELLED") safeStorage.remove(activeOrderKey(shopSlug));
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
  const number = order?.number;
  const shopName = order?.shopName;
  useEffect(() => {
    if (number === undefined || shopName === undefined || !status) return;
    document.title =
      status === "READY"
        ? t("titleReady", { number: String(number) })
        : t("titleWaiting", { number: String(number), shop: shopName });
  }, [number, shopName, status, t]);

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
        <div className={styles.lang}>
          <LocaleSwitcher />
        </div>
        <div className={styles.card}>
          <h1 className={styles.title}>{t("notFound")}</h1>
          <p className={styles.hint}>{t("linkInvalid")}</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <p className={styles.hint}>{tCommon("loading")}</p>
        </div>
      </main>
    );
  }

  const state = order.status.toLowerCase();

  return (
    <main className={styles.page}>
      <div className={styles.lang}>
        <LocaleSwitcher />
      </div>
      <div className={styles.card} data-state={state}>
        <p className={styles.shop}>{order.shopName}</p>
        <div
          className={styles.number}
          aria-label={t("numberAria", { number: String(order.number) })}
        >
          <bdi dir="ltr">
            <span className={styles.hash}>#</span>
            {order.number}
          </bdi>
        </div>

        {order.status === "PREPARING" && (
          <>
            <p className={styles.status} data-state={state}>
              {t("preparing")}
            </p>
            <p className={styles.hint}>{t("keepOpen")}</p>
            {!soundOn && (
              <button className={styles.button} onClick={enableSound}>
                {t("soundOn")}
              </button>
            )}
            <button
              className={styles.quiet}
              onClick={release}
              disabled={releasing}
            >
              {t("notMine")}
            </button>
          </>
        )}

        {order.status === "READY" && (
          <>
            <p className={styles.status} data-state={state}>
              {t("ready")}
            </p>
            <p className={styles.hint}>{t("collect")}</p>
          </>
        )}

        {order.status === "CANCELLED" && (
          <>
            <p className={styles.status}>{t("cancelled")}</p>
            <p className={styles.hint}>{t("cancelledHint")}</p>
          </>
        )}

        {order.status === "DONE" && (
          <>
            <p className={styles.status}>{t("collected")}</p>
            <p className={styles.hint}>{t("thanks")}</p>
          </>
        )}
      </div>
    </main>
  );
}
