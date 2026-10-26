"use client";

import QRCode from "qrcode";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
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

const STAGES = [
  {
    status: "PREPARING",
    label: "Pending",
    tone: "pending",
    empty: "No pending orders",
    hint: "New orders show up here.",
  },
  {
    status: "READY",
    label: "Ready",
    tone: "ready",
    empty: "Nothing ready yet",
    hint: "Orders you mark ready wait here for pickup.",
  },
  {
    status: "DONE",
    label: "Collected",
    tone: "done",
    empty: "Nothing collected yet",
    hint: "Picked-up orders are listed here.",
  },
] as const;

export function CashierBoard({ token }: { token: string }) {
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
      setBoard({ shopName: data.shop.name, orders: data.orders });
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
  // customer link, e.g. https://your-site/o/<secret>.
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

  async function resetLink(id: string) {
    if (!confirmReset) {
      setConfirmReset(true); // first tap asks, second tap does it
      return;
    }
    const error = await act(() =>
      call(`/${id}/reset-claim`, { method: "POST" }),
    );
    setConfirmReset(false);
    show(error ? "error" : "ok", error ?? "Link reset. Show the new QR.");
  }

  function show(kind: "ok" | "error", text: string) {
    setFlash({ kind, text });
    setTimeout(() => setFlash(null), 3500);
  }

  // Runs one request. Returns a message to show the cashier if the server
  // said "no" for a reason they can fix, otherwise null.
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
      if (res.status === 400) return "Enter a number from 1 to 9999.";
      if (res.status === 404 || res.status === 409) {
        // 409 = number in use, or someone else changed the order first.
        const data = await res.json().catch(() => null);
        return data?.message ?? "That did not work. Please try again.";
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

  async function createOrder(event: FormEvent) {
    event.preventDefault();
    const typed = numberInput.trim();
    if (typed !== "" && !/^[1-9]\d{0,3}$/.test(typed)) {
      show("error", "Enter a number from 1 to 9999, or leave it empty.");
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
      show("ok", typed === "" ? "Order created" : `Order #${typed} created`);
    }
  }

  async function setStatus(id: string, status: OrderStatus) {
    const error = await act(() =>
      call(`/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    );
    if (error) show("error", error);
  }

  const ordersIn = (status: OrderStatus) =>
    orders.filter((o) => o.status === status);

  return (
    <main className={styles.page}>
      <header className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.barTop}>
            <h1 className={styles.title}>{board?.shopName ?? "Cashier"}</h1>
            <span className={styles.live} data-state={problem ?? "ok"}>
              <span className={styles.liveDot} aria-hidden="true" />
              {problem === "offline"
                ? "Reconnecting"
                : problem
                  ? "Locked"
                  : "Live"}
            </span>
          </div>

          {!stopped && (
            <form className={styles.create} onSubmit={createOrder}>
              <input
                className={styles.input}
                inputMode="numeric"
                maxLength={4}
                placeholder="Next number"
                aria-label="Order number (optional)"
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                disabled={busy || !board}
              />
              <button
                className={styles.pillPrimary}
                type="submit"
                disabled={busy || !board}
              >
                New order
              </button>
            </form>
          )}
        </div>
      </header>

      <div className={styles.content}>
        {stopped ? (
          <p className={styles.notice}>
            This cashier link is not valid. Ask the shop owner for a new one.
          </p>
        ) : (
          <>
            {/* Phones show one stage at a time; wide screens hide this control. */}
            <div
              className={styles.segments}
              role="group"
              aria-label="Show orders"
            >
              {STAGES.map((stage) => (
                <button
                  key={stage.status}
                  className={styles.segment}
                  aria-pressed={stage.status === activeStage}
                  onClick={() => setActiveStage(stage.status)}
                >
                  {stage.label}
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
                      {stage.label}
                      <span className={styles.columnCount}>{rows.length}</span>
                    </h2>

                    {rows.length === 0 ? (
                      <div className={styles.empty}>
                        <p className={styles.emptyTitle}>{stage.empty}</p>
                        <p className={styles.emptyHint}>{stage.hint}</p>
                      </div>
                    ) : (
                      <ul className={styles.group}>
                        {rows.map((order) => (
                          <li key={order.id} className={styles.row}>
                            <div>
                              <div className={styles.number}>
                                <span className={styles.hash}>#</span>
                                {order.number}
                              </div>
                              {order.status === "DONE" && (
                                <div className={styles.caption}>
                                  {`Collected${
                                    order.doneAt
                                      ? ` at ${new Date(
                                          order.doneAt,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}`
                                      : ""
                                  }`}
                                </div>
                              )}
                              {order.status !== "DONE" && (
                                <button
                                  type="button"
                                  className={styles.link}
                                  data-linked={order.claimed}
                                  onClick={() => setSelectedId(order.id)}
                                  aria-label={`Order ${order.number}: ${
                                    order.claimed
                                      ? "phone linked, open QR options"
                                      : "no phone linked, show QR"
                                  }`}
                                >
                                  <PhoneIcon />
                                  {order.claimed
                                    ? "Phone linked"
                                    : "No phone \u00b7 QR"}
                                </button>
                              )}
                            </div>

                            {order.status === "PREPARING" && (
                              <button
                                className={styles.pillPrimary}
                                onClick={() => setStatus(order.id, "READY")}
                                disabled={busy}
                                aria-label={`Mark order ${order.number} ready`}
                              >
                                Ready
                              </button>
                            )}
                            {order.status === "READY" && (
                              <span className={styles.actions}>
                                <button
                                  className={styles.pillQuiet}
                                  onClick={() => setStatus(order.id, "PREPARING")}
                                  disabled={busy}
                                  aria-label={`Undo ready for order ${order.number}`}
                                >
                                  Undo
                                </button>
                                <button
                                  className={styles.pillPrimary}
                                  onClick={() => setStatus(order.id, "DONE")}
                                  disabled={busy}
                                  aria-label={`Order ${order.number} collected`}
                                >
                                  Collected
                                </button>
                              </span>
                            )}
                          </li>
                        ))}
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
        aria-label={selected ? `QR code for order ${selected.number}` : "QR code"}
      >
        {selected && (
          <div className={styles.sheetBody}>
            <h2 className={styles.sheetTitle}>
              <span className={styles.hash}>#</span>
              {selected.number}
            </h2>
            <p className={styles.sheetHint}>
              Customer: scan this with your phone camera.
            </p>
            <div className={styles.qrBox}>
              {qr && qr.token === selected.claimToken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.qr}
                  src={qr.url}
                  alt={`QR code that opens order ${selected.number}`}
                />
              ) : (
                <div className={styles.qrWait}>Drawing QR…</div>
              )}
            </div>
            <p className={styles.sheetStatus} data-linked={selected.claimed}>
              <PhoneIcon />
              {selected.claimed ? "Phone linked" : "Waiting for a scan"}
            </p>
            <div className={styles.sheetActions}>
              {selected.claimed && (
                <button
                  className={styles.pillQuiet}
                  onClick={() => resetLink(selected.id)}
                  disabled={busy}
                >
                  {confirmReset ? "Tap again to reset" : "Reset link"}
                </button>
              )}
              <button className={styles.pillPrimary} onClick={closeSheet}>
                Done
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
