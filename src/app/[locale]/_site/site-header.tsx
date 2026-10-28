import { getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import styles from "./site.module.css";

export async function SiteHeader() {
  const t = await getTranslations("site.nav");
  const common = await getTranslations("common");
  return (
    <header className={styles.header}>
      <div className={`${styles.container} ${styles.headerInner}`}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden />
          {common("brand")}
        </Link>
        <nav className={styles.links} aria-label="Main">
          <a href="#how">{t("how")}</a>
          <a href="#demo">{t("demo")}</a>
          <a href="#pricing">{t("pricing")}</a>
          <a href="#faq">{t("faq")}</a>
        </nav>
        <div className={styles.headerActions}>
          <LocaleSwitcher />
          <Link href="/login" className={styles.textLink}>
            {t("login")}
          </Link>
          <Link href="/signup" className={styles.buttonSmall}>
            {t("start")}
          </Link>
        </div>
      </div>
    </header>
  );
}
