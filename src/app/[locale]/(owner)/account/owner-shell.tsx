"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import styles from "./shell.module.css";

// The frame around every owner page: a side menu on laptops, a top bar on
// phones. It also checks the login once for all pages inside it.
export function OwnerShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const pathname = usePathname();
  // Branches stays highlighted on its own page and on the poster page below it.
  const onBranches = pathname.startsWith("/account") && !pathname.startsWith("/account/dashboard");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/owner/me", { cache: "no-store" }).catch(() => null);
      if (res?.status === 401) return router.replace("/login");
      if (res?.ok) setEmail(((await res.json()) as { email: string }).email);
    })();
  }, [router]);

  async function logout() {
    await fetch("/api/owner/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/login");
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label={t("title")}>
        <p className={styles.brand}>{t("title")}</p>

        <div className={styles.items}>
          <Link
            className={styles.item}
            href="/account"
            aria-current={onBranches ? "page" : undefined}
          >
            {t("branches")}
          </Link>
          <Link
            className={styles.item}
            href="/account/dashboard"
            aria-current={pathname.startsWith("/account/dashboard") ? "page" : undefined}
          >
            {t("dashboard")}
          </Link>
        </div>

        <div className={styles.foot}>
          {email && (
            <p className={styles.email} dir="ltr" title={email}>
              {email}
            </p>
          )}
          <div className={styles.footRow}>
            <LocaleSwitcher />
            <button className={styles.logout} type="button" onClick={logout}>
              {t("logout")}
            </button>
          </div>
        </div>
      </nav>

      {/* Always render the page: Next.js checks that pages can show up instantly,
          and a page hidden behind "wait for the login check" would fail that
          check. Pages fetch their own data; if nobody is logged in, the check
          above redirects to the login page. */}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
