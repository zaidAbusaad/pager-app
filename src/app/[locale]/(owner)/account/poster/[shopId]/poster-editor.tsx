"use client";

import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import {
  POSTER_COLORS,
  POSTER_DESIGNS,
  POSTER_LANGUAGES,
  POSTER_SIZES,
  POSTER_SIZE_KEYS,
  POSTER_TEXTS,
  type PosterColor,
  type PosterDesign,
  type PosterLanguage,
  type PosterSize,
} from "@/domain/poster";
import owner from "../../../owner.module.css";
import styles from "./poster.module.css";

interface Branch {
  id: string;
  name: string;
  slug: string;
}

export function PosterEditor({ shopId }: { shopId: string }) {
  const t = useTranslations("poster");
  const locale = useLocale();
  const router = useRouter();
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  const [branch, setBranch] = useState<Branch | null | undefined>(undefined);
  const [size, setSize] = useState<PosterSize>("a4");
  const [design, setDesign] = useState<PosterDesign>("bold");
  const [color, setColor] = useState<PosterColor>(POSTER_COLORS[0]);
  const [language, setLanguage] = useState<PosterLanguage>("both");
  const [qr, setQr] = useState("");
  const posterRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/owner/shops", { cache: "no-store" }).catch(() => null);
      if (res?.status === 401) return router.replace("/login");
      if (!res?.ok) return setBranch(null);
      const { shops } = (await res.json()) as { shops: Branch[] };
      setBranch(shops.find((s) => s.id === shopId) ?? null);
    })();
  }, [shopId, router]);

  const url = branch && origin ? `${origin}/s/${branch.slug}` : "";
  useEffect(() => {
    if (!url) return;
    let current = true;
    // margin 4 = the empty border (4 modules wide) that scanners expect.
    QRCode.toDataURL(url, { width: 1024, margin: 4, errorCorrectionLevel: "M" })
      .then((data) => current && setQr(data))
      .catch(() => current && setQr(""));
    return () => {
      current = false;
    };
  }, [url]);

  if (branch === undefined) return <p style={{ padding: 16 }}>…</p>;
  if (branch === null) {
    return (
      <div className={styles.missing}>
        <h1 className={styles.heading}>{t("notFound")}</h1>
        <Link className={owner.quiet} href="/account">
          {t("back")}
        </Link>
      </div>
    );
  }

  const { width, height } = POSTER_SIZES[size];

  // Saves the poster as a PNG at 300 dpi (print quality) for the chosen paper
  // size: pixels = millimetres / 25.4 * 300. html-to-image copies the poster
  // into an SVG picture and draws it at that larger scale.
  async function download() {
    const el = posterRef.current;
    if (!el || !branch) return;
    setSaving(true);
    try {
      const pixelRatio = ((width / 25.4) * 300) / el.offsetWidth;
      const dataUrl = await toPng(el, { pixelRatio, style: { boxShadow: "none" } });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${branch.slug}-poster-${size}.png`;
      link.click();
    } finally {
      setSaving(false);
    }
  }
  const langs = language === "both" ? (["ar", "en"] as const) : ([language] as const);

  return (
    <div className={styles.page}>
      {/* The paper size for the print dialog follows the chosen size. */}
      <style>{`@page { size: ${width}mm ${height}mm; margin: 0; }`}</style>

      <aside className={styles.controls}>
        <div className={styles.topRow}>
          <Link className={owner.quiet} href="/account">
            {t("back")}
          </Link>
        </div>
        <h1 className={styles.heading}>{t("title")}</h1>

        <Group label={t("size")}>
          {POSTER_SIZE_KEYS.map((key) => (
            <Choice key={key} on={size === key} onClick={() => setSize(key)}>
              {t(`sizes.${key}`)}
            </Choice>
          ))}
        </Group>

        <Group label={t("design")}>
          {POSTER_DESIGNS.map((key) => (
            <Choice key={key} on={design === key} onClick={() => setDesign(key)}>
              {t(`designs.${key}`)}
            </Choice>
          ))}
        </Group>

        <Group label={t("color")}>
          {POSTER_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={styles.swatch}
              style={{ background: c }}
              aria-pressed={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
            />
          ))}
        </Group>

        <Group label={t("language")}>
          {POSTER_LANGUAGES.map((key) => (
            <Choice key={key} on={language === key} onClick={() => setLanguage(key)}>
              {t(`languages.${key}`)}
            </Choice>
          ))}
        </Group>

        <div className={styles.actions}>
          <button className={owner.button} type="button" onClick={() => window.print()} disabled={!qr}>
            {t("print")}
          </button>
          <button className={owner.button} type="button" onClick={download} disabled={!qr || saving}>
            {saving ? t("preparing") : t("download")}
          </button>
        </div>
        <p className={styles.note}>{t("printHint")}</p>
      </aside>

      <div className={styles.stage} lang={locale}>
        <div
          ref={posterRef}
          className={styles.poster}
          data-design={design}
          data-size={size}
          style={{ "--w": width, "--h": height, "--accent": color } as CSSProperties}
        >
          <div className={styles.paper}>
          <h2
            className={styles.name}
            dir="auto"
            data-length={branch.name.length <= 18 ? "short" : branch.name.length <= 32 ? "medium" : "long"}
          >
            {branch.name}
          </h2>
          <div className={styles.qrCard}>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- generated data: URL
              <img className={styles.qr} src={qr} alt="" />
            ) : (
              <div className={styles.qr} />
            )}
          </div>
          <div className={styles.texts}>
            {langs.map((l) => (
              <div key={l} lang={l} dir={l === "ar" ? "rtl" : "ltr"} className={styles.textBlock}>
                <p className={styles.headline}>{POSTER_TEXTS[l].headline}</p>
                <p className={styles.hint}>{POSTER_TEXTS[l].hint}</p>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.group}>
      <span className={styles.groupLabel}>{label}</span>
      <div className={styles.options}>{children}</div>
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={styles.choice} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
