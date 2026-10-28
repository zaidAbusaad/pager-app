"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Stats, StatsRange } from "@/domain/stats";
import { useApiErrorMessage, useOfflineMessage } from "@/lib/use-api-error";
import { BarChart } from "./bar-chart";
import styles from "./dashboard.module.css";

interface Branch {
  id: string;
  name: string;
}

const RANGES: { value: StatsRange; key: "today" | "d7" | "d30" }[] = [
  { value: "today", key: "today" },
  { value: "7d", key: "d7" },
  { value: "30d", key: "d30" },
];

const hourText = (h: number) => `${String(h % 24).padStart(2, "0")}:00`;

export function Dashboard() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const apiError = useApiErrorMessage();
  const offlineMessage = useOfflineMessage();

  const [range, setRange] = useState<StatsRange>("7d");
  const [shopId, setShopId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  // The answer remembers which question it belongs to, so we know when it is stale.
  const [result, setResult] = useState<{ key: string; stats?: Stats; error?: string } | null>(null);

  const key = `${range}|${shopId}`;

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/owner/shops", { cache: "no-store" }).catch(() => null);
      if (res?.ok) setBranches(((await res.json()) as { shops: Branch[] }).shops);
    })();
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const query = new URLSearchParams({ range });
      if (shopId) query.set("shopId", shopId);
      try {
        const res = await fetch(`/api/owner/stats?${query}`, { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!current) return;
        setResult(res.ok ? { key, stats: body as Stats } : { key, error: apiError(body) });
      } catch {
        if (current) setResult({ key, error: offlineMessage() });
      }
    })();
    return () => {
      current = false;
    };
    // apiError/offlineMessage change identity every render; the question (key) is what matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Western digits in Arabic too, like the rest of the app.
  const numberLocale = locale === "ar" ? "ar-u-nu-latn" : "en";
  const nf = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 });
  const dayText = (date: string, long = false) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(numberLocale, {
      weekday: long ? "long" : "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const orders = (n: number) => t("ordersCount", { count: nf.format(n) });

  const stats = result?.key === key ? result.stats : undefined;
  const error = result?.key === key ? result.error : undefined;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>{t("title")}</h1>

      <div className={styles.filters}>
        <div className={styles.segments} role="group" aria-label={t("range")}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              aria-pressed={range === r.value}
              onClick={() => setRange(r.value)}
            >
              {t(`ranges.${r.key}`)}
            </button>
          ))}
        </div>
        {branches.length > 1 && (
          <label className={styles.branchPick}>
            <span className={styles.visuallyHidden}>{t("branch")}</span>
            <select value={shopId} onChange={(e) => setShopId(e.target.value)}>
              <option value="">{t("allBranches")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!stats && !error && <p className={styles.muted}>…</p>}

      {stats && stats.orders === 0 && stats.cancelled === 0 && (
        <p className={styles.empty}>{t("empty")}</p>
      )}

      {stats && (stats.orders > 0 || stats.cancelled > 0) && (
        <>
          <section className={styles.top}>
            <div className={styles.hero}>
              <p className={styles.label}>{t("orders")}</p>
              <p className={styles.heroNumber}>{nf.format(stats.orders)}</p>
              <Delta stats={stats} />
            </div>

            <div className={styles.tiles}>
              <Tile
                label={t("avgPrep")}
                value={stats.avgPrepMinutes === null ? "–" : t("minutes", { value: nf.format(stats.avgPrepMinutes) })}
                help={t("avgPrepHelp")}
              />
              <Tile
                label={t("avgPickup")}
                value={stats.avgPickupMinutes === null ? "–" : t("minutes", { value: nf.format(stats.avgPickupMinutes) })}
                help={t("avgPickupHelp")}
              />
              <Tile
                label={t("phoneLinked")}
                value={stats.phoneLinkedPercent === null ? "–" : `${nf.format(Math.round(stats.phoneLinkedPercent))}%`}
                help={t("phoneLinkedHelp")}
              />
              <Tile label={t("cancelled")} value={nf.format(stats.cancelled)} help={t("cancelledHelp")} />
            </div>
          </section>

          <section className={styles.insights}>
            {stats.peakHour && (
              <Insight
                ltr
                label={t("peakHour")}
                value={`${hourText(stats.peakHour.hour)}–${hourText(stats.peakHour.hour + 1)}`}
                detail={orders(stats.peakHour.orders)}
              />
            )}
            {stats.busiestDay && stats.byDay.length > 1 && (
              <Insight
                label={t("busiestDay")}
                value={dayText(stats.busiestDay.date, true)}
                detail={orders(stats.busiestDay.orders)}
              />
            )}
            {stats.slowestHour && (
              <Insight
                ltr
                label={t("slowestHour")}
                value={`${hourText(stats.slowestHour.hour)}–${hourText(stats.slowestHour.hour + 1)}`}
                detail={t("avgMinutes", { value: nf.format(stats.slowestHour.avgPrepMinutes) })}
              />
            )}
            {stats.byDay.length > 1 && (
              <Insight label={t("avgPerDay")} value={nf.format(stats.avgOrdersPerDay)} detail={t("perDay")} />
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>{t("byHour")}</h2>
            <BarChart
              ariaLabel={t("byHour")}
              idleReadout={t("hoverHint")}
              highlight={stats.peakHour?.hour ?? null}
              labelEvery={3}
              bars={stats.byHour.map((value, h) => ({
                key: String(h),
                label: hourText(h),
                value,
                readout: t("readout", { when: hourText(h), orders: orders(value) }),
              }))}
            />
            <details className={styles.details}>
              <summary>{t("showTable")}</summary>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{t("hour")}</th>
                    <th scope="col">{t("orders")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byHour.map((value, h) => (
                    <tr key={h}>
                      <td>{hourText(h)}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>

          {stats.byDay.length > 1 && (
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>{t("byDay")}</h2>
              <BarChart
                ariaLabel={t("byDay")}
                idleReadout={t("hoverHint")}
                highlight={stats.busiestDay ? stats.byDay.findIndex((d) => d.date === stats.busiestDay!.date) : null}
                labelEvery={stats.byDay.length > 10 ? 5 : 1}
                bars={stats.byDay.map((d) => ({
                  key: d.date,
                  label: stats.byDay.length > 10 ? dayText(d.date).replace(/^\S+,?\s*/, "") : dayText(d.date).split(/[ ,]/)[0],
                  value: d.orders,
                  readout: t("readout", { when: dayText(d.date), orders: orders(d.orders) }),
                }))}
              />
              <details className={styles.details}>
                <summary>{t("showTable")}</summary>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">{t("day")}</th>
                      <th scope="col">{t("orders")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byDay.map((d) => (
                      <tr key={d.date}>
                        <td>{dayText(d.date)}</td>
                        <td>{d.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Tile({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className={styles.tile}>
      <p className={styles.label}>{label}</p>
      <p className={styles.tileValue}>{value}</p>
      <p className={styles.help}>{help}</p>
    </div>
  );
}

// `ltr` keeps a time range like 13:00–14:00 in reading order inside Arabic text.
function Insight({ label, value, detail, ltr }: { label: string; value: string; detail: string; ltr?: boolean }) {
  return (
    <div className={styles.insight}>
      <p className={styles.label}>{label}</p>
      <p className={styles.insightValue}>{ltr ? <bdi dir="ltr">{value}</bdi> : value}</p>
      <p className={styles.help}>{detail}</p>
    </div>
  );
}

// "+12% vs previous period". Up is shown in green; down stays neutral,
// because fewer orders is not automatically bad news.
function Delta({ stats }: { stats: Stats }) {
  const t = useTranslations("dashboard");
  if (stats.previousOrders === 0) {
    return <p className={styles.delta}>{stats.orders > 0 ? t("deltaNew") : ""}</p>;
  }
  const percent = Math.round(((stats.orders - stats.previousOrders) / stats.previousOrders) * 100);
  if (percent === 0) return <p className={styles.delta}>{t("deltaSame")}</p>;
  return (
    <p className={styles.delta} data-up={percent > 0}>
      {percent > 0 ? "▲" : "▼"} {t("deltaPercent", { percent: Math.abs(percent) })}
    </p>
  );
}
