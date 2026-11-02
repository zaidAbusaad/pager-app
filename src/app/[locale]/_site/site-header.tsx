import Image from "next/image";
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
          <Image src="/brand/icon-96.png" alt="" width={32} height={32} className={styles.brandMark} />
          {common("brand")}
        </Link>
        <nav className={styles.links} aria-label="Main">
          <Link href="/#how">{t("how")}</Link>
          <Link href="/#demo">{t("demo")}</Link>
          <Link href="/#pricing">{t("pricing")}</Link>
          <Link href="/#faq">{t("faq")}</Link>
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
