"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { useApiErrorMessage, useOfflineMessage } from "@/lib/use-api-error";
import owner from "../../owner.module.css";
import styles from "../account.module.css";

type Notice = { kind: "ok" | "error"; text: string } | null;

// Settings page: contact phone number and change password.
export function Settings() {
  const t = useTranslations("settings");
  const apiError = useApiErrorMessage();
  const offlineMessage = useOfflineMessage();
  const router = useRouter();

  const [mustChange, setMustChange] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneNotice, setPhoneNotice] = useState<Notice>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<"phone" | "password" | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/owner/me", { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return; // the shell sends logged-out visitors to /login
      const me = (await res.json()) as {
        email: string;
        phone: string | null;
        mustChangePassword: boolean;
      };
      setMustChange(me.mustChangePassword);
      setEmail(me.email);
      setPhone(me.phone ?? "");
    })();
  }, []);

  // Sends one request and turns any failure into a sentence for the screen.
  async function send(
    kind: "phone" | "password",
    url: string,
    method: string,
    body: unknown,
    onOk: (res: Response) => Promise<Notice>,
    setNotice: (n: Notice) => void,
  ) {
    setBusy(kind);
    setNotice(null);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setNotice(await onOk(res));
      else setNotice({ kind: "error", text: apiError(await res.json().catch(() => null)) });
    } catch {
      setNotice({ kind: "error", text: offlineMessage() });
    }
    setBusy(null);
  }

  function savePhone(event: FormEvent) {
    event.preventDefault();
    void send(
      "phone",
      "/api/owner/profile",
      "PATCH",
      { phone },
      async (res) => {
        const saved = ((await res.json()) as { phone: string | null }).phone;
        setPhone(saved ?? "");
        return { kind: "ok", text: t(saved ? "phoneSaved" : "phoneRemoved") };
      },
      setPhoneNotice,
    );
  }

  function savePassword(event: FormEvent) {
    event.preventDefault();
    void send(
      "password",
      "/api/owner/password",
      "POST",
      { currentPassword: current, newPassword: next },
      async () => {
        setCurrent("");
        setNext("");
        // The forced change is done: go to the app (the menu re-checks on the way).
        if (mustChange) router.replace("/account");
        return { kind: "ok", text: t("passwordSaved") };
      },
      setPasswordNotice,
    );
  }

  const show = (n: Notice) =>
    n && (
      <p className={n.kind === "error" ? owner.error : owner.hint} role={n.kind === "error" ? "alert" : "status"}>
        {n.text}
      </p>
    );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>
      {mustChange && (
        <p className={owner.error} role="alert">
          {t("mustChange")}
        </p>
      )}
      {email && (
        <p className={styles.muted}>
          {t("email")}: <bdi dir="ltr">{email}</bdi>
        </p>
      )}

      <form className={styles.addForm} onSubmit={savePhone}>
        <h2>{t("phoneTitle")}</h2>
        <p className={styles.muted}>{t("phoneHelp")}</p>
        <label className={owner.field}>
          <span className={owner.label}>{t("phoneLabel")}</span>
          <input
            className={`${owner.input} ${owner.ltr}`}
            type="tel"
            name="phone"
            autoComplete="tel"
            inputMode="tel"
            maxLength={40}
            placeholder="07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        {show(phoneNotice)}
        <button className={owner.button} type="submit" disabled={busy !== null}>
          {busy === "phone" ? t("working") : t("phoneSave")}
        </button>
      </form>

      <form className={styles.addForm} onSubmit={savePassword}>
        <h2>{t("passwordTitle")}</h2>
        <p className={styles.muted}>{t("passwordHelp")}</p>
        <label className={owner.field}>
          <span className={owner.label}>{t("current")}</span>
          <input
            className={`${owner.input} ${owner.ltr}`}
            type="password"
            name="current-password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className={owner.field}>
          <span className={owner.label}>{t("new")}</span>
          <input
            className={`${owner.input} ${owner.ltr}`}
            type="password"
            name="new-password"
            autoComplete="new-password"
            required
            minLength={8}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <span className={owner.fieldHint}>{t("newHint")}</span>
        </label>
        {show(passwordNotice)}
        <button className={owner.button} type="submit" disabled={busy !== null}>
          {busy === "password" ? t("working") : t("passwordSave")}
        </button>
      </form>
    </div>
  );
}
