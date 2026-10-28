"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { playChime, unlockAudio, vibrate } from "@/lib/alert-sound";
import styles from "./live-demo.module.css";

type Status = "PREPARING" | "READY" | "DONE";
interface DemoOrder {
  id: number;
  number: number;
  status: Status;
}

const FIRST_NUMBER = 27;

// A tiny pretend version of the real app: a cashier screen and a customer's
// phone side by side, sharing one piece of state. Nothing is sent anywhere;
// it only exists in the visitor's browser tab.
export function LiveDemo() {
  const t = useTranslations("site.demo");
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  // The order the "phone" is linked to (like the real claim, by number).
  const [linkedId, setLinkedId] = useState<number | null>(null);

  const linked = orders.find((o) => o.id === linkedId) ?? null;
  // The phone can scan only if there is an order that no phone has linked yet.
  const unclaimed = orders.find((o) => o.status !== "DONE" && o.id !== linkedId) ?? null;

  // 5 = finished: every step is shown as done
  const step =
    linked?.status === "DONE" ? 5 : linked?.status === "READY" ? 4 : linked ? 3 : orders.length > 0 ? 2 : 1;

  function newOrder() {
    setOrders((list) => [...list, { id: list.length + 1, number: FIRST_NUMBER + list.length, status: "PREPARING" }]);
  }

  function setStatus(id: number, status: Status) {
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    if (status === "READY" && id === linkedId) {
      playChime();
      vibrate();
    }
  }

  function scan() {
    unlockAudio(); // the tap lets the browser play the chime later
    // like the real counter QR: the newest order nobody linked yet
    const newest = [...orders].reverse().find((o) => o.status !== "DONE" && o.id !== linkedId);
    if (newest) setLinkedId(newest.id);
  }

  function restart() {
    setOrders([]);
    setLinkedId(null);
  }

  const steps = [t("step1"), t("step2"), t("step3"), t("step4")];

  return (
    <div className={styles.demo}>
      <ol className={styles.steps}>
        {steps.map((text, i) => (
          <li key={text} data-state={i + 1 < step ? "done" : i + 1 === step ? "current" : "todo"}>
            <span className={styles.stepDot}>{i + 1}</span>
            {text}
          </li>
        ))}
      </ol>

      <div className={styles.stage}>
        {/* ---- the cashier's screen ---- */}
        <section className={styles.cashier} aria-label={t("cashier")}>
          <header className={styles.cashierBar}>
            <h3>
              {t("shop")} · {t("cashier")}
            </h3>
            <button type="button" className={styles.primary} onClick={newOrder} data-pulse={step === 1}>
              {t("newOrder")}
            </button>
          </header>

          {orders.length === 0 ? (
            <p className={styles.empty}>{t("emptyCashier")}</p>
          ) : (
            <ul className={styles.rows}>
              {orders
                .filter((o) => o.status !== "DONE")
                .map((o) => (
                  <li key={o.id} className={styles.row}>
                    <span className={styles.rowNumber}>
                      <bdi dir="ltr">#{o.number}</bdi>
                    </span>
                    <span className={styles.rowStatus} data-status={o.status}>
                      {o.status === "READY" ? t("readyLabel") : t("preparing")}
                    </span>
                    {o.status === "PREPARING" ? (
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={() => setStatus(o.id, "READY")}
                        data-pulse={step === 3 && o.id === linkedId}
                      >
                        {t("ready")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.quiet}
                        onClick={() => {
                          setStatus(o.id, "DONE");
                        }}
                      >
                        {t("collected")}
                      </button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </section>

        {/* ---- the customer's phone ---- */}
        <section className={styles.phone} aria-label={t("phone")}>
          <div className={styles.screen} data-state={linked ? linked.status.toLowerCase() : "idle"}>
            <p className={styles.shop}>{t("shop")}</p>

            {!linked || linked.status === "DONE" ? (
              linked?.status === "DONE" ? (
                <>
                  <p className={styles.big}>{t("thanks")}</p>
                  <button type="button" className={styles.primary} onClick={restart}>
                    {t("again")}
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.qr} aria-hidden />
                  <p className={styles.hint}>{unclaimed ? t("scanReady") : t("scanHint")}</p>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={scan}
                    disabled={!unclaimed}
                    data-pulse={step === 2}
                  >
                    {t("scan")}
                  </button>
                </>
              )
            ) : (
              <>
                <p className={styles.number}>
                  <bdi dir="ltr">#{linked.number}</bdi>
                </p>
                {linked.status === "PREPARING" ? (
                  <p className={styles.status}>{t("orderPreparing")}</p>
                ) : (
                  <>
                    <p className={styles.status}>{t("orderReady")}</p>
                    <p className={styles.hint}>{t("collect")}</p>
                  </>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
