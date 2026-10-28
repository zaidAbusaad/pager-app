"use client";

import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useRouter } from "@/i18n/navigation";
import { unlockAudio } from "@/lib/alert-sound";
import { activeOrderKey, safeStorage } from "@/lib/safe-storage";
import { useApiErrorMessage, useOfflineMessage } from "@/lib/use-api-error";
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
  const t = useTranslations("claim");
  const apiError = useApiErrorMessage();
  const offlineMessage = useOfflineMessage();
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
        setView({ kind: "form", message: apiError(body) });
      } catch {
        setView({ kind: "form", message: offlineMessage() });
      }
      setBusy(false);
    },
    [slug, router, apiError, offlineMessage],
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
          if (order.status === "PREPARING" || order.status === "READY") {
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
      setView({ kind: "form", message: t("enterNumber") });
      return;
    }
    void claim(number);
  }

  return (
    <main className={styles.page}>
      <div className={styles.lang}>
        <LocaleSwitcher />
      </div>
      <div className={styles.card}>
        {view.kind === "working" && (
          <>
            {shopName && <p className={styles.shop}>{shopName}</p>}
            <h1 className={styles.title}>{t("finding")}</h1>
            <p className={styles.hint}>{t("moment")}</p>
          </>
        )}

        {view.kind === "missing" && (
          <>
            <h1 className={styles.title}>{t("shopMissing")}</h1>
            <p className={styles.hint}>{t("qrInvalid")}</p>
          </>
        )}

        {view.kind === "form" && (
          <>
            {shopName && <p className={styles.shop}>{shopName}</p>}
            <h1 className={styles.title}>{t("title")}</h1>
            {view.message ? (
              <p className={styles.error} role="alert">
                {view.message}
              </p>
            ) : (
              <p className={styles.hint}>{t("typeNumber")}</p>
            )}
            <form className={styles.form} onSubmit={submitNumber}>
              <input
                className={styles.input}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                placeholder={t("placeholder")}
                aria-label={t("numberAria")}
                value={typed}
                onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))}
                maxLength={4}
              />
              <button className={styles.button} disabled={busy || typed === ""}>
                {busy ? t("linking") : t("linkButton")}
              </button>
            </form>
            <button
              className={styles.quiet}
              disabled={busy}
              onClick={() => void claim()}
            >
              {t("tryAgain")}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
