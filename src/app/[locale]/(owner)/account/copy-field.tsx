"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import styles from "../owner.module.css";

// A read-only link with a Copy button.
export function CopyField({ label, value }: { label: string; value: string }) {
  const t = useTranslations("account");
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (for example on plain http on a phone).
      // The text is still selectable in the box, so nothing else to do.
    }
  }

  return (
    <div className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.copyRow}>
        <input
          className={`${styles.input} ${styles.ltr} ${styles.copyInput}`}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button className={styles.small} type="button" onClick={copy}>
          {copied ? t("copied") : t("copy")}
        </button>
      </div>
    </div>
  );
}
