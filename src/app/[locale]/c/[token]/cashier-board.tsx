"use client";

import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { useApiErrorMessage } from "@/lib/use-api-error";
import styles from "./cashier-board.module.css";

type OrderStatus = "PREPARING" | "READY" | "DONE";

interface OrderDto {
  id: string;
  number: number;
  status: OrderStatus;
  doneAt: string | null;
  claimToken: string; // secret of this order's customer link (/o/<claimToken>)
  claimed: boolean; // true once a phone is linked to the order
}

interface Board {
  shopName: string;
  orders: OrderDto[];
  nextNumber: number; // what an order created without a number would get
}

type Flash = { kind: "ok" | "error"; text: string } | null;

const REFRESH_MS = 3000;

// A small phone outline drawn with SVG (no icon library needed).
function PhoneIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </svg>
  );
}

// The three stages. `key` points at the texts in messages/*.json.
const STAGES = [
  { status: "PREPARING", key: "pending", tone: "pending" },
  { status: "READY", key: "ready", tone: "ready" },
  { status: "DONE", key: "done", tone: "done" },
] as const;

// Order numbers are always written left-to-right ("#27"), even inside Arabic
// text, so the # never jumps to the wrong side of the digits.
function OrderNumber({ number }: { number: number }) {
  return (
    <bdi dir="ltr">
      <span className={styles.hash}>#</span>
      {number}
    </bdi>
  );
}

export function CashierBoard({ token }: { token: string }) {
  const t = useTranslations("cashier");
  const locale = useLocale();
  const apiError = useApiErrorMessage();

  const [board, setBoard] = useState<Board | null>(null);
  const [problem, setProblem] = useState<"invalid" | "offline" | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeStage, setActiveStage] = useState<OrderStatus>("PREPARING");
  const [numberInput, setNumberInput] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  // The order whose QR sheet is open, and the picture of its QR code.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ token: string; url: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // The pending order whose Cancel button was tapped once (it asks again).
  const [armedCancelId, setArmedCancelId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // One helper for every request: adds the secret as a Bearer token.
  const call = useCallback(
    (path: string, init: RequestInit = {}) =>
      fetch(`/api/cashier/orders${path}`, {
        ...init,
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }),
    [token],
  );

  const refresh = useCallback(async () => {
    try {
      const res = await call("");
      if (res.status === 401) {
        setProblem("invalid");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBoard({
        shopName: data.shop.name,
        orders: data.orders,
        nextNumber: data.nextNumber,
      });
      setProblem(null);
    } catch {
      setProblem("offline");
    }
  }, [call]);

  // Poll the server every few seconds so every cashier phone stays in sync.
  // (Later we can replace polling with a live stream; the page won't change.)
  const stopped = problem === "invalid";
  useEffect(() => {
    if (stopped) return;
    // React wants state updates to happen in callbacks, not directly in the
    // effect body, so even the very first load runs from a (0 ms) timer.
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, stopped]);

  const orders = board?.orders ?? [];
  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const selectedToken = selected?.claimToken;
  const sheetOpen = selected !== null;

  // Draw the QR code of the selected order. The code holds the order's full
  // customer link, e.g. https://your-site/o/<secret> (no language in it: the
  // customer's own phone language decides).
  useEffect(() => {
    if (!selectedToken) return;
    let cancelled = false;
    QRCode.toDataURL(`${window.location.origin}/o/${selectedToken}`, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => !cancelled && setQr({ token: selectedToken, url }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedToken]);

  // <dialog> gives us focus trapping and the Esc key for free.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (sheetOpen && !dialog.open) dialog.showModal();
    if (!sheetOpen && dialog.open) dialog.close();
  }, [sheetOpen]);

  function closeSheet() {
    setSelectedId(null);
    setConfirmReset(false);
  }

  function show(kind: "ok" | "error", text: string) {
    setFlash({ kind, text });
    setTimeout(() => setFlash(null), 3500);
  }

  // Runs one request. Returns a message (already in the cashier's language)
  // if the server said "no" for a reason they can fix, otherwise null.
  async function act(run: () => Promise<Response>): Promise<string | null> {
    if (busy) return null;
    setBusy(true);
    try {
      const res = await run();
      if (res.ok) return null;
      if (res.status === 401) {
        setProblem("invalid");
        return null;
      }
      if (res.status === 400) return t("toast.badNumberShort");
      if (res.status === 404 || res.status === 409) {
        // 409 = number in use, or someone else changed the order first.
        return apiError(await res.json().catch(() => null));
      }
      setProblem("offline");
      return null;
    } catch {
      setProblem("offline");
      return null;
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  async function resetLink(id: string) {
    if (!confirmReset) {
      setConfirmReset(true); // first tap asks, second tap does it
      return;
    }
    const error = await act(() =>
      call(`/${id}/reset-claim`, { method: "POST" }),
    );
    setConfirmReset(false);
    show(error ? "error" : "ok", error ?? t("toast.linkReset"));
  }

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    const typed = numberInput.trim();
    if (typed !== "" && !/^[1-9]\d{0,3}$/.test(typed)) {
      show("error", t("toast.badNumber"));
      return;
    }
    const body = typed === "" ? {} : { number: Number(typed) };
    const error = await act(() =>
      call("", { method: "POST", body: JSON.stringify(body) }),
    );
    if (error) {
      show("error", error);
    } else {
      setNumberInput("");
      setActiveStage("PREPARING");
      show(
        "ok",
        typed === ""
          ? t("toast.created")
          : t("toast.createdNumber", { number: typed }),
      );
    }
  }

  // Cancel needs two taps so a slip of the finger cannot cancel an order.
  async function cancelPending(id: string) {
    if (armedCancelId !== id) {
      setArmedCancelId(id);
      setTimeout(() => setArmedCancelId((cur) => (cur === id ? null : cur)), 3000);
      return;
    }
    setArmedCancelId(null);
    const error = await act(() => call(`/${id}`, { method: "DELETE" }));
    show(error ? "error" : "ok", error ?? t("toast.cancelled"));
  }

  async function setStatus(id: string, status: OrderStatus) {
    const error = await act(() =>
      call(`/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    );
    if (error) show("error", error);
  }

  const ordersIn = (status: OrderStatus) =>
    orders.filter((o) => o.status === status);

  // Times use Western digits (14:05) in both languages, like the order numbers.
  const timeLocale = locale === "ar" ? "ar-u-nu-latn" : "en";
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(timeLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <main className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.barTop}>
            <h1 className={styles.title}>
              {board?.shopName ?? t("defaultTitle")}
            </h1>
            <div className={styles.barRight}>
              <span className={styles.live} data-state={problem ?? "ok"}>
                <span className={styles.liveDot} aria-hidden="true" />
                {problem === "offline"
                  ? t("reconnecting")
                  : problem
                    ? t("locked")
                    : t("live")}
              </span>
              <LocaleSwitcher />
            </div>
          </div>

          {!stopped && (
            <form className={styles.create} onSubmit={createOrder}>
              <input
                className={styles.input}
                inputMode="numeric"
                maxLength={4}
                placeholder={
                  board
                    ? t("nextNumberValue", { number: String(board.nextNumber) })
                    : t("nextNumber")
                }
                aria-label={t("numberAria")}
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                disabled={busy || !board}
              />
              <button
                className={styles.pillPrimary}
                type="submit"
                disabled={busy || !board}
              >
                {t("newOrder")}
              </button>
            </form>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {stopped ? (
          <p className={styles.notice}>{t("invalidLink")}</p>
        ) : (
          <>
            {/* Phones show one stage at a time; wide screens hide this control. */}
            <div
              className={styles.segments}
              role="group"
              aria-label={t("showOrders")}
            >
              {STAGES.map((stage) => (
                <button
                  key={stage.status}
                  className={styles.segment}
                  aria-pressed={stage.status === activeStage}
                  onClick={() => setActiveStage(stage.status)}
                >
                  {t(`stages.${stage.key}.label`)}
                  <span className={styles.segmentCount}>
                    {ordersIn(stage.status).length}
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.columns}>
              {STAGES.map((stage) => {
                const rows = ordersIn(stage.status);
                return (
                  <section
                    key={stage.status}
                    className={styles.column}
                    data-active={stage.status === activeStage}
                    data-tone={stage.tone}
                    aria-labelledby={`stage-${stage.status}`}
                  >
                    <h2
                      id={`stage-${stage.status}`}
                      className={styles.columnTitle}
                    >
                      <span className={styles.toneDot} aria-hidden="true" />
                      {t(`stages.${stage.key}.label`)}
                      <span className={styles.columnCount}>{rows.length}</span>
                    </h2>

                    {rows.length === 0 ? (
                      <div className={styles.empty}>
                        <p className={styles.emptyTitle}>
                          {t(`stages.${stage.key}.empty`)}
                        </p>
                        <p className={styles.emptyHint}>
                          {t(`stages.${stage.key}.hint`)}
                        </p>
                      </div>
                    ) : (
                      <ul className={styles.group}>
                        {rows.map((order) => {
                          const num = { number: String(order.number) };
                          return (
                            <li key={order.id} className={styles.row}>
                              <div>
                                <div className={styles.number}>
                                  <OrderNumber number={order.number} />
                                </div>
                                {order.status === "DONE" && (
                                  <div className={styles.caption}>
                                    {order.doneAt
                                      ? t("collectedAt", {
                                          time: formatTime(order.doneAt),
                                        })
                                      : t("collected")}
                                  </div>
                                )}
                                {order.status !== "DONE" && (
                                  <button
                                    type="button"
                                    className={styles.link}
                                    data-linked={order.claimed}
                                    onClick={() => setSelectedId(order.id)}
                                    aria-label={
                                      order.claimed
                                        ? t("badgeAriaLinked", num)
                                        : t("badgeAriaNone", num)
                                    }
                                  >
                                    <PhoneIcon />
                                    {order.claimed
                                      ? t("phoneLinked")
                                      : t("noPhone")}
                                  </button>
                                )}
                              </div>

                              {order.status === "PREPARING" && (
                                <span className={styles.actions}>
                                  <button
                                    className={styles.pillDanger}
                                    data-armed={armedCancelId === order.id}
                                    onClick={() => cancelPending(order.id)}
                                    disabled={busy}
                                    aria-label={t("ariaCancel", num)}
                                  >
                                    {armedCancelId === order.id
                                      ? t("confirm")
                                      : t("cancel")}
                                  </button>
                                  <button
                                    className={styles.pillPrimary}
                                    onClick={() => setStatus(order.id, "READY")}
                                    disabled={busy}
                                    aria-label={t("ariaReady", num)}
                                  >
                                    {t("ready")}
                                  </button>
                                </span>
                              )}
                              {order.status === "DONE" && (
                                <button
                                  className={styles.pillQuiet}
                                  onClick={() => setStatus(order.id, "READY")}
                                  disabled={busy}
                                  aria-label={t("ariaUndoCollected", num)}
                                >
                                  {t("undo")}
                                </button>
                              )}
                              {order.status === "READY" && (
                                <span className={styles.actions}>
                                  <button
                                    className={styles.pillQuiet}
                                    onClick={() =>
                                      setStatus(order.id, "PREPARING")
                                    }
                                    disabled={busy}
                                    aria-label={t("ariaUndoReady", num)}
                                  >
                                    {t("undo")}
                                  </button>
                                  <button
                                    className={styles.pillPrimary}
                                    onClick={() => setStatus(order.id, "DONE")}
                                    disabled={busy}
                                    aria-label={t("ariaCollected", num)}
                                  >
                                    {t("collectedButton")}
                                  </button>
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.sheet}
        onClose={closeSheet}
        onClick={(e) => e.target === e.currentTarget && closeSheet()}
        aria-label={
          selected
            ? t("sheet.aria", { number: String(selected.number) })
            : t("sheet.ariaGeneric")
        }
      >
        {selected && (
          <div className={styles.sheetBody}>
            <h2 className={styles.sheetTitle}>
              <OrderNumber number={selected.number} />
            </h2>
            <p className={styles.sheetHint}>{t("sheet.hint")}</p>
            <div className={styles.qrBox}>
              {qr && qr.token === selected.claimToken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.qr}
                  src={qr.url}
                  alt={t("sheet.alt", { number: String(selected.number) })}
                />
              ) : (
                <div className={styles.qrWait}>{t("sheet.drawing")}</div>
              )}
            </div>
            <p className={styles.sheetStatus} data-linked={selected.claimed}>
              <PhoneIcon />
              {selected.claimed ? t("sheet.linked") : t("sheet.waiting")}
            </p>
            <div className={styles.sheetActions}>
              {selected.claimed && (
                <button
                  className={styles.pillQuiet}
                  onClick={() => resetLink(selected.id)}
                  disabled={busy}
                >
                  {confirmReset ? t("sheet.resetConfirm") : t("sheet.reset")}
                </button>
              )}
              <button className={styles.pillPrimary} onClick={closeSheet}>
                {t("sheet.done")}
              </button>
            </div>
          </div>
        )}
      </dialog>

      {flash && (
        <div className={styles.toast} data-kind={flash.kind} role="status">
          {flash.text}
        </div>
      )}
    </main>
  );
}
