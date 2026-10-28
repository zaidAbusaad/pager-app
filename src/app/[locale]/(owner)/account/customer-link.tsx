"use client";

import QRCode from "qrcode";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import styles from "../owner.module.css";
import { CopyField } from "./copy-field";

// The branch's customer link, shown as a QR code by default, with a switch to
// the plain link. The QR can be downloaded as a PNG image for printing.
export function CustomerLink({ url, name, slug }: { url: string; name: string; slug: string }) {
  const t = useTranslations("account");
  const [mode, setMode] = useState<"qr" | "link">("qr");
  const [image, setImage] = useState("");

  useEffect(() => {
    // `url` is only a full address once the browser has filled in the site name.
    if (!url.startsWith("http")) return;
    let current = true;
    // 1024 px, so it stays sharp when printed. margin = the white "quiet zone"
    // scanners need around a QR code.
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then((data) => current && setImage(data))
      .catch(() => current && setImage(""));
    return () => {
      current = false;
    };
  }, [url]);

  return (
    <div className={styles.field}>
      <div className={styles.rowBetween}>
        <span className={styles.label}>{t("customerLink")}</span>
        <div className={styles.toggle} role="group" aria-label={t("customerLink")}>
          <button type="button" aria-pressed={mode === "qr"} onClick={() => setMode("qr")}>
            {t("showQr")}
          </button>
          <button type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>
            {t("showLink")}
          </button>
        </div>
      </div>

      {mode === "qr" ? (
        <div className={styles.qrArea}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, nothing to optimise
            <img className={styles.qr} src={image} alt={t("qrAlt", { name })} width={200} height={200} />
          ) : (
            <div className={styles.qr} aria-hidden />
          )}
          <a className={styles.small} href={image || undefined} download={`${slug}-qr.png`} aria-disabled={!image}>
            {t("downloadQr")}
          </a>
        </div>
      ) : (
        <CopyField label="" value={url} />
      )}
      <p className={styles.fieldHint}>{t("customerLinkHelp")}</p>
    </div>
  );
}
