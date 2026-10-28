"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage, useOfflineMessage } from "@/lib/use-api-error";
import owner from "../owner.module.css";
import styles from "./account.module.css";
import { CopyField } from "./copy-field";
import { CustomerLink } from "./customer-link";

interface Branch {
  id: string;
  name: string;
  slug: string;
}

// Branches page. On a laptop: the list of branches (and the add form) on one
// side, the selected branch's details on the other. On a phone they stack.
export function Account() {
  const t = useTranslations("account");
  const apiError = useApiErrorMessage();
  const offlineMessage = useOfflineMessage();

  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The cashier secret exists only right after creating/replacing a link.
  const [fresh, setFresh] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // The site address, read in the browser only ("" while rendering on the server).
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/owner/shops", { cache: "no-store" }).catch(() => null);
      if (res?.ok) {
        const list = ((await res.json()) as { shops: Branch[] }).shops;
        setBranches(list);
        setSelectedId((current) => current ?? list[0]?.id ?? null);
      }
    })();
  }, []);

  async function send(url: string, body?: unknown) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) return data;
      setMessage(apiError(data));
    } catch {
      setMessage(offlineMessage());
    } finally {
      setBusy(false);
    }
    return null;
  }

  async function addBranch(event: FormEvent) {
    event.preventDefault();
    const data = await send("/api/owner/shops", { name });
    if (!data) return;
    setName("");
    setBranches((list) => [...(list ?? []), data.shop]);
    setSelectedId(data.shop.id);
    setFresh((f) => ({ ...f, [data.shop.id]: data.cashierToken }));
  }

  async function newCashierLink(id: string) {
    // Two taps: replacing the link disables the old one straight away.
    if (confirming !== id) {
      setConfirming(id);
      return;
    }
    setConfirming(null);
    const data = await send(`/api/owner/shops/${id}/cashier-link`);
    if (data) setFresh((f) => ({ ...f, [id]: data.cashierToken }));
  }

  if (branches === null) return <p className={styles.muted}>…</p>;
  const selected = branches.find((b) => b.id === selectedId) ?? null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("branches")}</h1>

      <div className={styles.grid}>
        <section className={styles.side}>
          {branches.length > 0 && (
            <ul className={styles.list}>
              {branches.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    className={styles.branchButton}
                    aria-current={b.id === selectedId ? "true" : undefined}
                    onClick={() => {
                      setSelectedId(b.id);
                      setConfirming(null);
                    }}
                  >
                    <span className={styles.branchName} dir="auto">
                      {b.name}
                    </span>
                    <span className={styles.slug} dir="ltr">
                      /s/{b.slug}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className={styles.addForm} onSubmit={addBranch}>
            <label className={owner.field}>
              <span className={owner.label}>{t("branchName")}</span>
              <input
                className={owner.input}
                name="name"
                maxLength={60}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {message && (
              <p className={owner.error} role="alert">
                {message}
              </p>
            )}
            <button className={owner.button} type="submit" disabled={busy}>
              {t("addBranch")}
            </button>
          </form>
        </section>

        <section className={styles.detail}>
          {selected === null ? (
            <p className={styles.muted}>{t("noBranches")}</p>
          ) : (
            <>
              <div className={styles.detailHead}>
                <h2 className={styles.detailTitle} dir="auto">
                  {selected.name}
                </h2>
                <Link className={owner.small} href={`/account/poster/${selected.id}`}>
                  {t("printPoster")}
                </Link>
              </div>

              <div className={styles.panels}>
                <div className={styles.panel}>
                  <CustomerLink
                    url={`${origin}/s/${selected.slug}`}
                    name={selected.name}
                    slug={selected.slug}
                  />
                </div>

                <div className={styles.panel}>
                  {fresh[selected.id] ? (
                    <>
                      <CopyField
                        label={t("cashierLink")}
                        value={`${origin}/c/${fresh[selected.id]}`}
                      />
                      <p className={owner.warn}>{t("cashierLinkOnce")}</p>
                    </>
                  ) : (
                    <>
                      <span className={owner.label}>{t("cashierLink")}</span>
                      <p className={owner.fieldHint}>{t("cashierLinkHidden")}</p>
                    </>
                  )}
                  <button
                    className={owner.quiet}
                    type="button"
                    disabled={busy}
                    onClick={() => newCashierLink(selected.id)}
                  >
                    {confirming === selected.id ? t("confirmNewLink") : t("newCashierLink")}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
