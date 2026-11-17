"use client";

import { useLocale, useTranslations } from "next-intl";
import { whatsappLink } from "@/domain/plans";
import { EXPIRY_WARNING_DAYS, type SubscriptionSummary } from "@/domain/subscription";
import styles from "./shell.module.css";

// A strip at the top of every owner page that says where the subscription
// stands. It shows nothing while the account is active with time to spare.
// All the dates and the day count come from the server (see
// summarizeSubscription), so this screen needs no clock of its own.
export function SubscriptionBanner({
  summary,
  email,
}: {
  summary: SubscriptionSummary;
  email: string;
}) {
  const t = useTranslations("subscription");
  const locale = useLocale();
  // Jordan time, with Western digits in Arabic too (like order numbers).
  const showDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en", {
          timeZone: "Asia/Amman",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

  let title: string;
  let text: string;
  let tone: "warn" | "danger" = "warn";
  let waMessage = t("waRenew", { email });

  if (summary.state === "pending") {
    title = t("pendingTitle");
    text = t("pendingText");
    waMessage = t("waPending", { email });
  } else if (summary.state === "active") {
    if (summary.daysLeft === null || summary.daysLeft > EXPIRY_WARNING_DAYS) return null;
    title = t("soonTitle", { date: showDate(summary.activeUntil) });
    text = t("soonText");
  } else if (summary.state === "grace") {
    title = t("graceTitle");
    text = t("graceText", { date: showDate(summary.graceEndsAt) });
  } else {
    title = t("expiredTitle");
    text = t("expiredText");
    tone = "danger";
  }

  return (
    <aside className={styles.banner} data-tone={tone} role="status">
      <p className={styles.bannerTitle}>{title}</p>
      <p className={styles.bannerText}>{text}</p>
      <a
        className={styles.bannerButton}
        href={whatsappLink(waMessage)}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t("button")}
      </a>
    </aside>
  );
}
