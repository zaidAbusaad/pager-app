import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PLANS } from "@/domain/plans";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./sections";
import styles from "./site.module.css";

interface Section {
  title: string;
  paragraphs: string[];
}

// One layout for both legal pages: a title, the date, then numbered sections.
// The texts live in messages/*.json under "legal.<document>".
export async function LegalPage({ document }: { document: "privacy" | "terms" }) {
  const t = await getTranslations("legal");
  const sections = t.raw(`${document}.sections`) as Section[];
  const fill = (text: string) =>
    text
      .replace("{monthly}", String(PLANS.monthlyPrice))
      .replace("{yearly}", String(PLANS.yearlyPrice));

  return (
    <div className={styles.site}>
      <SiteHeader />
      <main className={`${styles.container} ${styles.narrow} ${styles.legal}`}>
        <Link href="/" className={styles.legalBack}>
          ← {t("back")}
        </Link>
        <h1 className={styles.h1}>{t(`${document}.title`)}</h1>
        <p className={styles.muted}>{t("updated")}</p>
        {sections.map((section, i) => (
          <section key={section.title}>
            <h2 className={styles.legalH2}>
              {i + 1}. {section.title}
            </h2>
            {section.paragraphs.map((p) => (
              <p key={p} className={styles.legalP}>
                {fill(p)}
              </p>
            ))}
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
