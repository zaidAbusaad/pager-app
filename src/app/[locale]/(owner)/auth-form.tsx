"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link, useRouter } from "@/i18n/navigation";
import { useApiErrorMessage, useOfflineMessage } from "@/lib/use-api-error";
import styles from "./owner.module.css";

// One form for both screens: "login" and "signup" differ only in texts, the
// address it posts to, and the browser's password-manager hint.
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useTranslations("auth");
  const apiError = useApiErrorMessage();
  const offlineMessage = useOfflineMessage();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(
        signup ? "/api/owner/auth/register" : "/api/owner/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      if (res.ok) {
        router.replace("/account");
        return;
      }
      setMessage(apiError(await res.json().catch(() => null)));
    } catch {
      setMessage(offlineMessage());
    }
    setBusy(false);
  }

  return (
    <main className={styles.page}>
      <div className={styles.lang}>
        <LocaleSwitcher />
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>{t(signup ? "signupTitle" : "loginTitle")}</h1>
        <form className={styles.form} onSubmit={submit}>
          <label className={styles.field}>
            <span className={styles.label}>{t("email")}</span>
            <input
              className={`${styles.input} ${styles.ltr}`}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t("password")}</span>
            <input
              className={`${styles.input} ${styles.ltr}`}
              type="password"
              name="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {signup && <span className={styles.fieldHint}>{t("passwordHint")}</span>}
          </label>
          {message && (
            <p className={styles.error} role="alert">
              {message}
            </p>
          )}
          <button className={styles.button} type="submit" disabled={busy}>
            {busy ? t("working") : t(signup ? "signupButton" : "loginButton")}
          </button>
        </form>
        <p className={styles.switch}>
          {t(signup ? "haveAccount" : "noAccount")}{" "}
          <Link className={styles.link} href={signup ? "/login" : "/signup"}>
            {t(signup ? "loginLink" : "signupLink")}
          </Link>
        </p>
      </div>
    </main>
  );
}
